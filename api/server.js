import http from 'node:http';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });

const db = new Database(process.env.DB_PATH || join(dataDir, 'community.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const port = Number(process.env.PORT || 18082);
const adminToken = process.env.ADMIN_TOKEN || '';
const allowedTypes = new Set(['news', 'tools', 'discussions', 'submissions', 'magazine', 'hotlist']);
const allowedEmoji = new Set([
  '👍','👎','❤️','😂','😮','😢','😡','👏',
  '🙏','🤔','👀','🔥','🚀','💯','✨','🎉',
  '💡','🧠','🫡','🤝','☕','🌊','🧩','🛠️',
]);
const rateBuckets = new Map();

db.exec(
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, display_name TEXT NOT NULL, avatar_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reactions (
  type TEXT NOT NULL, item_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (type, item_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, item_id TEXT NOT NULL, user_id TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT DEFAULT '', body TEXT DEFAULT '',
  source TEXT DEFAULT '', source_url TEXT DEFAULT '', author_id TEXT NOT NULL,
  category TEXT DEFAULT 'general', published_at TEXT NOT NULL, archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', url TEXT DEFAULT '',
  author_id TEXT NOT NULL, tags TEXT DEFAULT '', published_at TEXT NOT NULL, archived INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS discussions (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT DEFAULT '', author_id TEXT NOT NULL,
  category TEXT DEFAULT 'general', published_at TEXT NOT NULL, archived INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT DEFAULT '', author_id TEXT NOT NULL,
  tags TEXT DEFAULT '', status TEXT DEFAULT 'pending', submitted_at TEXT NOT NULL, created_at TEXT NOT NULL
);
);

// Prepared statements
const stmts = {};
function prep(sql) { return db.prepare(sql); }
stmts.getUser = prep('SELECT * FROM users WHERE id = ?');
stmts.upsertUser = prep('INSERT INTO users (id,display_name,avatar_url,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at');
stmts.getReactions = prep('SELECT emoji,COUNT(*) as cnt FROM reactions WHERE type=? AND item_id=? GROUP BY emoji');
stmts.getMyReactions = prep('SELECT emoji FROM reactions WHERE type=? AND item_id=? AND user_id=?');
stmts.addReaction = prep('INSERT OR IGNORE INTO reactions (type,item_id,user_id,emoji,created_at) VALUES (?,?,?,?,?)');
stmts.removeReaction = prep('DELETE FROM reactions WHERE type=? AND item_id=? AND user_id=? AND emoji=?');
stmts.getExperiences = prep('SELECT e.*,u.display_name,u.avatar_url FROM experiences e LEFT JOIN users u ON e.user_id=u.id WHERE e.type=? AND e.item_id=? ORDER BY e.created_at DESC');
stmts.addExperience = prep('INSERT INTO experiences (id,type,item_id,user_id,body,created_at) VALUES (?,?,?,?,?,?)');
stmts.countExperiences = prep('SELECT COUNT(*) n FROM experiences WHERE type=? AND item_id=?');
stmts.topReactions = prep('SELECT type,item_id,COUNT(*) as total FROM reactions GROUP BY type,item_id ORDER BY total DESC LIMIT 20');
stmts.topExperiences = prep('SELECT type,item_id,COUNT(*) as total FROM experiences GROUP BY type,item_id ORDER BY total DESC LIMIT 20');
stmts.trending = prep('SELECT e.type,e.item_id,COUNT(*) as links FROM experiences e GROUP BY e.type,e.item_id ORDER BY links DESC LIMIT 10');

// Helper: create CRUD prep statements for a table
function crud(table, idField, orderField, authorIdField) {
  return {
    list: prep(SELECT t.*,u.display_name as author_name FROM  t LEFT JOIN users u ON u.id=t. ORDER BY t. DESC LIMIT ? OFFSET ?),
    get: prep(SELECT t.*,u.display_name as author_name FROM  t LEFT JOIN users u ON u.id=t. WHERE t.=?),
    count: prep(SELECT COUNT(*) n FROM ),
    deleteR: prep(DELETE FROM  WHERE =?),
  };
}
const tables = {
  news: crud('news','id','published_at','author_id'),
  tools: crud('tools','id','published_at','author_id'),
  discussions: crud('discussions','id','published_at','author_id'),
  submissions: crud('submissions','id','submitted_at','author_id'),
};
tables.news.insert = prep('INSERT INTO news (id,title,summary,body,source,source_url,author_id,category,published_at,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
tables.tools.insert = prep('INSERT INTO tools (id,title,description,url,author_id,tags,published_at,archived,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
tables.discussions.insert = prep('INSERT INTO discussions (id,title,body,author_id,category,published_at,archived,created_at) VALUES (?,?,?,?,?,?,?,?)');
tables.submissions.insert = prep('INSERT INTO submissions (id,title,body,author_id,tags,status,submitted_at,created_at) VALUES (?,?,?,?,?,?,?,?)');

// Helpers
function visitorId(req) {
  const m = (req.headers.cookie||'').match(/sid=([^;]+)/);
  return m ? m[1] : crypto.randomUUID();
}
function httpError(c,m) { const e=new Error(m); e.statusCode=c; return e; }
function rl(key,limit=30,windowMs=60000) {
  const now=Date.now(), b=rateBuckets.get(key)||{count:0,reset:now+windowMs};
  if(now>b.reset){b.count=0;b.reset=now+windowMs}
  b.count++; rateBuckets.set(key,b);
  if(b.count>limit) throw httpError(429,'Too many requests');
}
function parseBody(req) {
  return new Promise((resolve,reject)=>{
    const c=[]; let s=0;
    req.on('data',d=>{s+=d.length;if(s>16384)reject(httpError(413,'Body too large'));c.push(d)});
    req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(c).toString()))}catch{reject(httpError(400,'Invalid JSON'))}});
    req.on('error',reject);
  });
}
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
function authAdmin(req){const t=(req.headers.authorization||'').replace('Bearer ','');if(!adminToken||t!==adminToken)throw httpError(401,'Unauthorized')}
function requireUser(u){if(!u)throw httpError(403,'请先保存身份')}
function maxAge(t){return t==='news'?2:t==='discussions'?30:365}
function nowISO(){return new Date().toISOString()}
function parseUrl(url){const u=new URL(url,'http://localhost');return{pathname:u.pathname,query:Object.fromEntries(u.searchParams)}}

async function handleRequest(req,res){
  try{
    const {pathname,query}=parseUrl(req.url);
    const method=req.method;
    const vid=visitorId(req);
    if(!(req.headers.cookie||'').includes('sid=')) res.setHeader('Set-Cookie',sid=; Path=/; SameSite=Lax; Max-Age=31536000);
    let user=stmts.getUser.get(vid);
    if(!user){
      const n=nowISO();
      stmts.upsertUser.run(vid,访客-,'',n,n);
      user=stmts.getUser.get(vid);
    }

    // Health
    if(pathname==='/api/health'&&method==='GET') return json(res,{ok:true});

    // Identity
    if(pathname==='/api/identity/manual'&&method==='POST'){
      rl(id:); const b=await parseBody(req);
      const n=String(b.displayName||'').trim().slice(0,40), a=String(b.avatarUrl||'').trim().slice(0,300);
      if(!n) throw httpError(400,'昵称不能为空');
      if(a&&!a.startsWith('https://')) throw httpError(400,'头像只允许 https://');
      const t=nowISO(); stmts.upsertUser.run(vid,n,a,t,t); user=stmts.getUser.get(vid);
      return json(res,{ok:true,displayName:user.display_name});
    }
    if(pathname==='/api/identity/status'&&method==='GET') return json(res,{needsName:false,displayName:user.display_name,avatarUrl:user.avatar_url,wechatEnabled:false});

    // List content: GET /api/items?type=news&filter=active&limit=50&offset=0
    if(pathname==='/api/items'&&method==='GET'){
      const type=query.type; if(!type||!allowedTypes.has(type)) throw httpError(400,'Invalid type');
      const t=type;
      const lim=Math.min(parseInt(query.limit)||50,100), off=parseInt(query.offset)||0, fil=query.filter||'all';
      const all=tables[t].list.all(lim,off);
      const total=tables[t].count.get().n;
      let items=all;
      if(fil==='active'){
        const ma=maxAge(t);
        items=all.filter(i=>Date.now()-new Date(i.published_at||i.submitted_at).getTime()<ma*864e5);
      }else if(fil==='archived'){
        const ma=maxAge(t);
        items=all.filter(i=>Date.now()-new Date(i.published_at||i.submitted_at).getTime()>=ma*864e5);
      }
      const itemsWithMeta=items.map(it=>{
        const rc={}; for(const r of stmts.getReactions.all(t,it.id)) rc[r.emoji]=r.cnt;
        return{...it,reactions:rc,experienceCount:stmts.countExperiences.get(t,it.id).n};
      });
      return json(res,{items:itemsWithMeta,total,limit:lim,offset:off});
    }

    // Create content: POST /api/items
    if(pathname==='/api/items'&&method==='POST'){
      const b=await parseBody(req);
      const type=b.type; if(!type||!allowedTypes.has(type)) throw httpError(400,'Invalid type');
      requireUser(user); rl(c:,6,60000);
      const title=String(b.title||'').trim(); if(!title||title.length>120) throw httpError(400,'标题不能为空且不超过120字');
      const id=crypto.randomUUID(), n=nowISO();
      if(type==='news'){
        tables.news.insert.run(id,title,String(b.summary||'').trim().slice(0,300),String(b.body||'').trim().slice(0,8000),
          String(b.source||'').trim().slice(0,100),String(b.source_url||'').trim().slice(0,500),vid,
          String(b.category||'general').trim().slice(0,50),n,0,n,n);
      }else if(type==='tools'){
        tables.tools.insert.run(id,title,String(b.description||'').trim().slice(0,500),String(b.url||'').trim().slice(0,500),vid,
          (Array.isArray(b.tags)?b.tags.join(','):String(b.tags||'')).trim().slice(0,200),n,0,n);
      }else if(type==='discussions'){
        tables.discussions.insert.run(id,title,String(b.body||'').trim().slice(0,8000),vid,
          String(b.category||'general').trim().slice(0,50),n,0,n);
      }else if(type==='submissions'){
        tables.submissions.insert.run(id,title,String(b.body||'').trim().slice(0,8000),vid,
          (Array.isArray(b.tags)?b.tags.join(','):String(b.tags||'')).trim().slice(0,200),'visible',n,n);
      }else throw httpError(400,'Unsupported type');
      return json(res,{id,type},201);
    }

    // Get single item: GET /api/items/:type/:id
    const getM=pathname.match(/^\/api\/items\/([^/]+)\/([^/]+)$/);
    if(getM&&method==='GET'){
      const[,type,id]=getM; if(!allowedTypes.has(type)) throw httpError(400,'Invalid type');
      const it=tables[type].get.get(id); if(!it) throw httpError(404,'Not found');
      const rc={}; for(const r of stmts.getReactions.all(type,id)) rc[r.emoji]=r.cnt;
      return json(res,{...it,reactions:rc,experienceCount:stmts.countExperiences.get(type,id).n});
    }

    // Delete: DELETE /api/items/:type/:id
    if(getM&&method==='DELETE'){authAdmin(req);const[,type,id]=getM;tables[type].deleteR.run(id);return json(res,{ok:true})}

    // Reactions
    const reM=pathname.match(/^\/api\/items\/([^/]+)\/([^/]+)\/reactions$/);
    if(reM){
      const[,type,id]=reM;
      if(method==='GET'){
        const rc={}; for(const r of stmts.getReactions.all(type,id)) rc[r.emoji]=r.cnt;
        return json(res,{counts:rc,mine:stmts.getMyReactions.all(type,id,vid).map(r=>r.emoji)});
      }
      if(method==='POST'){
        rl(:,60,60000); const b=await parseBody(req); const e=String(b.emoji||'').trim();
        if(!allowedEmoji.has(e)) throw httpError(400,'不支持的表情');
        if(prep('SELECT 1 FROM reactions WHERE type=? AND item_id=? AND user_id=? AND emoji=?').get(type,id,vid,e)) stmts.removeReaction.run(type,id,vid,e);
        else stmts.addReaction.run(type,id,vid,e,nowISO());
        const rc={}; for(const r of stmts.getReactions.all(type,id)) rc[r.emoji]=r.cnt;
        return json(res,{counts:rc,mine:stmts.getMyReactions.all(type,id,vid).map(r=>r.emoji)});
      }
    }

    // Experiences
    const exM=pathname.match(/^\/api\/items\/([^/]+)\/([^/]+)\/experiences$/);
    if(exM){
      const[,type,id]=exM;
      if(method==='GET') return json(res,{experiences:stmts.getExperiences.all(type,id).map(r=>({id:r.id,body:r.body,createdAt:r.created_at,displayName:r.display_name||'匿名',avatarUrl:r.avatar_url||''}))});
      if(method==='POST'){rl(e:,12,60000);requireUser(user);const b=await parseBody(req);const t=String(b.body||'').trim();if(!t)throw httpError(400,'内容不能为空');if(t.length>2000)throw httpError(400,'内容过长');stmts.addExperience.run(crypto.randomUUID(),type,id,vid,t,nowISO());return json(res,{ok:true})}
    }

    // Stats
    if(pathname==='/api/stats'&&method==='GET') return json(res,{topReactions:stmts.topReactions.all(),topExperiences:stmts.topExperiences.all(),trending:stmts.trending.all()});

    // Lifecycle summary
    if(pathname==='/api/lifecycle'&&method==='GET'){
      const r={};
      for(const t of['news','discussions','tools']){
        const ma=maxAge(t);
        const all=prep(SELECT id,published_at FROM ).all();
        r[t]={active:all.filter(i=>Date.now()-new Date(i.published_at).getTime()<ma*864e5).length,archived:all.filter(i=>Date.now()-new Date(i.published_at).getTime()>=ma*864e5).length};
      }
      return json(res,r);
    }

    throw httpError(404,'Not found');
  }catch(err){json(res,{error:err.message||'Internal error'},err.statusCode||500)}
}

const server=http.createServer(handleRequest);
server.listen(port,'127.0.0.1',()=>{console.log(lesh-seminar-api v2 listening on )});