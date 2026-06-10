import http from 'node:http';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
var _d=dirname(fileURLToPath(import.meta.url)),dd=process.env.DATA_DIR||join(_d,'data');mkdirSync(dd,{recursive:true});
var db=new Database(process.env.DB_PATH||join(dd,'community.sqlite'));db.pragma('journal_mode=WAL');
var pt=Number(process.env.PORT||18082),at=process.env.ADMIN_TOKEN||'',rb={};
db.prepare("CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,display_name TEXT NOT NULL,avatar_url TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
db.prepare("CREATE TABLE IF NOT EXISTS reactions(type TEXT NOT NULL,item_id TEXT NOT NULL,user_id TEXT NOT NULL,emoji TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(type,item_id,user_id,emoji))").run();
db.prepare("CREATE TABLE IF NOT EXISTS experiences(id TEXT PRIMARY KEY,type TEXT NOT NULL,item_id TEXT NOT NULL,user_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL)").run();
db.prepare("CREATE TABLE IF NOT EXISTS content_links(id TEXT PRIMARY KEY,source_type TEXT NOT NULL,source_id TEXT NOT NULL,target_type TEXT NOT NULL,target_id TEXT NOT NULL,user_id TEXT NOT NULL,created_at TEXT NOT NULL)").run();
db.prepare("CREATE TABLE IF NOT EXISTS news(id TEXT PRIMARY KEY,title TEXT NOT NULL,summary TEXT,body TEXT,source TEXT,source_url TEXT,author_id TEXT NOT NULL,category TEXT DEFAULT 'general',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)").run();
db.prepare("CREATE TABLE IF NOT EXISTS tools(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT,url TEXT,author_id TEXT NOT NULL,tags TEXT,published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL)").run();
db.prepare("CREATE TABLE IF NOT EXISTS discussions(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT,author_id TEXT NOT NULL,category TEXT DEFAULT 'general',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL)").run();
db.prepare("CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT,author_id TEXT NOT NULL,tags TEXT,status TEXT DEFAULT 'pending',submitted_at TEXT NOT NULL,created_at TEXT NOT NULL)").run();
var ae=new Set(['\ud83d\udc4d','\ud83d\udc4e','\u2764\ufe0f','\ud83d\ude02','\ud83d\ude2e','\ud83d\ude22','\ud83d\ude21','\ud83d\udc4f','\ud83d\ude4f','\ud83e\udd14','\ud83d\udc40','\ud83d\udd25','\ud83d\ude80','\ud83d\udcaf','\u2728','\ud83c\udf89','\ud83d\udca1','\ud83e\udde0','\ud83e\udee1','\ud83e\udd1d','\u2615','\ud83c\udf0a','\ud83e\udde9','\ud83d\udee0\ufe0f']);
var pp={};function qq(s){if(!pp[s])pp[s]=db.prepare(s);return pp[s]};
qq('SELECT*FROM users WHERE id=?');
qq('INSERT INTO users(id,display_name,avatar_url,created_at,updated_at)VALUES(?,?,?,?,?)ON CONFLICT(id)DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at');
qq('SELECT emoji,COUNT(*)cnt FROM reactions WHERE type=?AND item_id=?GROUP BY emoji');
qq('SELECT emoji FROM reactions WHERE type=?AND item_id=?AND user_id=?');
qq('INSERT OR IGNORE INTO reactions(type,item_id,user_id,emoji,created_at)VALUES(?,?,?,?,?)');
qq('DELETE FROM reactions WHERE type=?AND item_id=?AND user_id=?AND emoji=?');
qq('SELECT e.*,u.display_name,u.avatar_url FROM experiences e LEFT JOIN users u ON e.user_id=u.id WHERE e.type=?AND e.item_id=?ORDER BY e.created_at DESC');
qq('INSERT INTO experiences(id,type,item_id,user_id,body,created_at)VALUES(?,?,?,?,?,?)');
qq('SELECT COUNT(*)n FROM experiences WHERE type=?AND item_id=?');
qq('SELECT type,item_id,COUNT(*)total FROM reactions GROUP BY type,item_id ORDER BY total DESC LIMIT 20');
qq('SELECT e.type,e.item_id,COUNT(*)links FROM experiences e GROUP BY e.type,e.item_id ORDER BY links DESC LIMIT 10');
qq('SELECT*FROM content_links WHERE source_type=?AND source_id=?');
qq('SELECT COUNT(*)n FROM content_links WHERE target_type=?AND target_id=?');
qq('INSERT INTO content_links(id,source_type,source_id,target_type,target_id,user_id,created_at)VALUES(?,?,?,?,?,?,?)');
function cr(t,o,a,isql){var n=qq;return{li:n('SELECT t.*,u.display_name an FROM '+t+' t LEFT JOIN users u ON u.id=t.'+a+' ORDER BY t.'+o+' DESC LIMIT ? OFFSET ?'),ge:n('SELECT t.*,u.display_name an FROM '+t+' t LEFT JOIN users u ON u.id=t.'+a+' WHERE t.id=?'),cn:n('SELECT COUNT(*)n FROM '+t),de:n('DELETE FROM '+t+' WHERE id=?'),in_:isql?n(isql):null}};
var T={};
T.news=cr('news','published_at','author_id','INSERT INTO news(id,title,summary,body,source,source_url,author_id,category,published_at,archived,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
T.tools=cr('tools','published_at','author_id','INSERT INTO tools(id,title,description,url,author_id,tags,published_at,archived,created_at)VALUES(?,?,?,?,?,?,?,?,?)');
T.disc=cr('discussions','published_at','author_id','INSERT INTO discussions(id,title,body,author_id,category,published_at,archived,created_at)VALUES(?,?,?,?,?,?,?,?)');
T.discussions=T.disc;
T.sub=cr('submissions','submitted_at','author_id','INSERT INTO submissions(id,title,body,author_id,tags,status,submitted_at,created_at)VALUES(?,?,?,?,?,?,?,?)');
function vi(r){var m=(r.headers.cookie||'').match(/sid=([^;]+)/);return m?m[1]:crypto.randomUUID()}
function eh(c,m){var e=new Error(m);e.statusCode=c;return e}
function rl(k,l,ms){var n=Date.now();if(!rb[k])rb[k]={c:0,r:n+(ms||60000)};if(n>rb[k].r){rb[k].c=0;rb[k].r=n+(ms||60000)}rb[k].c++;if(rb[k].c>(l||30))throw eh(429,'')}
function jr(d,st,rs){try{rs.writeHead(st||200,{'Content-Type':'application/json'});rs.end(JSON.stringify(d))}catch(e){}}
function aa(r){var x=(r.headers.authorization||'').replace('Bearer ','');if(!at||x!==at)throw eh(401,'')}
function ru(u){if(!u)throw eh(403,'')}
function ma(t){return t==='news'?3:t==='discussions'?30:365}
function nw(){return new Date().toISOString()}
function pu(u){var nu=new URL(u,'http://localhost');return{p:nu.pathname,q:Object.fromEntries(nu.searchParams)}}
function pb(r){return new Promise(function(rs,rj){var B=[];function drain(){var c;while(null!==(c=r.read()))B.push(c)};function done(){drain();try{rs(JSON.parse(Buffer.concat(B).toString()))}catch(e){rj(eh(400,''))}};if(r.readableEnded||r.destroyed)return done();r.on('readable',drain);r.on('end',done);r.on('error',rj)})};
var sv=http.createServer(async function(req,res){
try{
var _p=pu(req.url),p=_p.p,Q=_p.q,m=req.method;
if(m==='POST'||m==='PUT'){var BODY=null;try{BODY=await pb(req)}catch(e){}if(BODY===null||typeof BODY!=="object"){BODY={type:Q.type,title:Q.title,summary:Q.summary,body:Q.body,source:Q.source,source_url:Q.source_url,category:Q.category,tags:Q.tags,displayName:Q.displayName,avatarUrl:Q.avatarUrl,targetType:Q.targetType,targetId:Q.targetId,emoji:Q.emoji,sourceType:Q.sourceType,sourceId:Q.sourceId}}}else{var BODY=null}
if(!(req.headers.cookie||'').includes('sid='))res.setHeader('Set-Cookie','sid='+vi(req)+'; Path=/; SameSite=Lax; Max-Age=31536000');
var vid=vi(req);var us=qq('SELECT*FROM users WHERE id=?').get(vid);if(!us){var _n=nw();qq('INSERT INTO users(id,display_name,avatar_url,created_at,updated_at)VALUES(?,?,?,?,?)ON CONFLICT(id)DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at').run(vid,'\u8bbf\u5ba2-'+vid.slice(0,6),'',_n,_n);us=qq('SELECT*FROM users WHERE id=?').get(vid)};
function jd(d,st){jr(d,st,res)}
if(p==='/api/health'&&m==='GET')return jd({ok:true})
if(p==='/api/identity/status'&&m==='GET'){var needName=!us.display_name||us.display_name.startsWith('\u8bbf\u5ba2-');return jd({needsName:needName,displayName:us.display_name,avatarUrl:us.avatar_url})}
if(p==='/api/identity/manual'&&m==='POST'){rl('i'+vid,30);var nm=(BODY.displayName||'').trim().slice(0,40),av=(BODY.avatarUrl||'').trim().slice(0,300);if(!nm)throw eh(400,'');if(av&&!av.startsWith('https://'))throw eh(400,'');var _t=nw();qq('INSERT INTO users(id,display_name,avatar_url,created_at,updated_at)VALUES(?,?,?,?,?)ON CONFLICT(id)DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at').run(vid,nm,av,_t,_t);return jd({ok:true})}
if(p==='/api/items'&&m==='GET'){var typ=Q.type;if(!typ||!T[typ])throw eh(400,'');var li=Math.min(parseInt(Q.limit)||50,100),of=parseInt(Q.offset)||0,fi=Q.filter||'all';var al=T[typ].li.all(li,of);var it=al;if(fi==='active'){var M=ma(typ);it=al.filter(function(i){return Date.now()-new Date(i.published_at||i.submitted_at).getTime()<M*864e5})}else if(fi==='archived'){var M=ma(typ);it=al.filter(function(i){return Date.now()-new Date(i.published_at||i.submitted_at).getTime()>=M*864e5})}var me=it.map(function(itm){var rc={};var rr=qq('SELECT emoji,COUNT(*)cnt FROM reactions WHERE type=?AND item_id=?GROUP BY emoji').all(typ,itm.id);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;itm.reactions=rc;itm.experienceCount=qq('SELECT COUNT(*)n FROM experiences WHERE type=?AND item_id=?').get(typ,itm.id).n;return itm});return jd({items:me,total:T[typ].cn.get().n,limit:li,offset:of})}
if(p==='/api/items'&&m==='POST'){var typ=BODY.type;if(!typ||!T[typ])throw eh(400,'');ru(us);rl('c'+vid,6);var ti=(BODY.title||'').trim();if(!ti||ti.length>120)throw eh(400,'');var id=crypto.randomUUID(),_n=nw();
if(typ==='news'){T.news.in_.run(id,ti,(BODY.summary||'').trim().slice(0,300),(BODY.body||'').trim().slice(0,8000),(BODY.source||'').trim().slice(0,100),(BODY.source_url||'').trim().slice(0,500),vid,(BODY.category||'general').trim().slice(0,50),_n,0,_n,_n)}
if(typ==='tools'){T.tools.in_.run(id,ti,(BODY.description||'').trim().slice(0,500),(BODY.url||'').trim().slice(0,500),vid,(BODY.tags&&BODY.tags.join?BODY.tags.join(','):String(BODY.tags||'')).trim().slice(0,200),_n,0,_n)}
if(typ==='discussions'){T.disc.in_.run(id,ti,(BODY.body||'').trim().slice(0,8000),vid,(BODY.category||'general').trim().slice(0,50),_n,0,_n)}
if(typ==='submissions'){T.sub.in_.run(id,ti,(BODY.body||'').trim().slice(0,8000),vid,(BODY.tags&&BODY.tags.join?BODY.tags.join(','):String(BODY.tags||'')).trim().slice(0,200),'visible',_n,_n)}
return jd({id:id,type:typ},201)}
var gM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)$/),ty=gM?gM[1]:'',iid=gM?gM[2]:'';
var rM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/reactions$/);
var eM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/experiences$/);
var lM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/links$/);
if(gM&&!rM&&!eM&&!lM&&m==='GET'){if(!ty||!T[ty])throw eh(400,'');var it=T[ty].ge.get(iid);if(!it)throw eh(404,'');var rc={};var rr=qq('SELECT emoji,COUNT(*)cnt FROM reactions WHERE type=?AND item_id=?GROUP BY emoji').all(ty,iid);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;it.reactions=rc;it.experienceCount=qq('SELECT COUNT(*)n FROM experiences WHERE type=?AND item_id=?').get(ty,iid).n;it.linkCount=qq('SELECT COUNT(*)n FROM content_links WHERE target_type=?AND target_id=?').get(ty,iid).n;return jd(it)}
if(gM&&!rM&&!eM&&!lM&&m==='DELETE'){aa(req);T[ty].de.run(iid);qq('DELETE FROM reactions WHERE type=?AND item_id=?').run(ty,iid);qq('DELETE FROM experiences WHERE type=?AND item_id=?').run(ty,iid);return jd({ok:true})}
if(rM){if(m==='GET'){var rc={};var rr=qq('SELECT emoji,COUNT(*)cnt FROM reactions WHERE type=?AND item_id=?GROUP BY emoji').all(ty,iid);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;var mi=qq('SELECT emoji FROM reactions WHERE type=?AND item_id=?AND user_id=?').all(ty,iid,vid).map(function(r){return r.emoji});return jd({counts:rc,mine:mi})}
if(m==='POST'){rl('r'+vid,60);var em=(BODY.emoji||'').trim();if(!ae.has(em))throw eh(400,'');if(qq('SELECT 1 FROM reactions WHERE type=?AND item_id=?AND user_id=?AND emoji=?').get(ty,iid,vid,em)){qq('DELETE FROM reactions WHERE type=?AND item_id=?AND user_id=?AND emoji=?').run(ty,iid,vid,em)}else{qq('INSERT OR IGNORE INTO reactions(type,item_id,user_id,emoji,created_at)VALUES(?,?,?,?,?)').run(ty,iid,vid,em,nw())};var rc={};var rr=qq('SELECT emoji,COUNT(*)cnt FROM reactions WHERE type=?AND item_id=?GROUP BY emoji').all(ty,iid);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;var mi=qq('SELECT emoji FROM reactions WHERE type=?AND item_id=?AND user_id=?').all(ty,iid,vid).map(function(r){return r.emoji});return jd({counts:rc,mine:mi})}}
if(eM){if(m==='GET'){var exps=qq('SELECT e.*,u.display_name,u.avatar_url FROM experiences e LEFT JOIN users u ON e.user_id=u.id WHERE e.type=?AND e.item_id=?ORDER BY e.created_at DESC').all(ty,iid).map(function(r){return{id:r.id,body:r.body,createdAt:r.created_at,displayName:r.display_name||'',avatarUrl:r.avatar_url||''}});return jd({experiences:exps})}
if(m==='POST'){rl('e'+vid,12);ru(us);var tx=(BODY.body||'').trim();if(!tx)throw eh(400,'');if(tx.length>2000)throw eh(400,'');qq('INSERT INTO experiences(id,type,item_id,user_id,body,created_at)VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),ty,iid,vid,tx,nw());return jd({ok:true},201)}}
if(lM){if(m==='GET'){var links=qq('SELECT*FROM content_links WHERE source_type=?AND source_id=?').all(ty,iid);return jd({links:links})}
if(m==='POST'){rl('l'+vid,20);if(!BODY.targetType||!BODY.targetId)throw eh(400,'');qq('INSERT INTO content_links(id,source_type,source_id,target_type,target_id,user_id,created_at)VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),ty,iid,BODY.targetType,BODY.targetId,vid,nw());return jd({ok:true},201)}}
if(p==='/api/stats'&&m==='GET')return jd({topReactions:qq('SELECT type,item_id,COUNT(*)total FROM reactions GROUP BY type,item_id ORDER BY total DESC LIMIT 20').all(),trending:qq('SELECT e.type,e.item_id,COUNT(*)links FROM experiences e GROUP BY e.type,e.item_id ORDER BY links DESC LIMIT 10').all()})
if(p==='/api/links'&&m==='GET'){var lt=Q.type,li=qq('SELECT*FROM content_links WHERE source_type=?AND source_id=?').all(lt||'',Q.id||'');return jd({links:li})}
if(p==='/api/links'&&m==='POST'){rl('l'+vid,20);if(!BODY.sourceType||!BODY.sourceId||!BODY.targetType||!BODY.targetId)throw eh(400,'');qq('INSERT INTO content_links(id,source_type,source_id,target_type,target_id,user_id,created_at)VALUES(?,?,?,?,?,?,?)').run(crypto.randomUUID(),BODY.sourceType,BODY.sourceId,BODY.targetType,BODY.targetId,vid,nw());return jd({ok:true},201)}
if(p==='/api/lifecycle'&&m==='GET'){var r={};['news','discussions','tools'].forEach(function(tp){var M=ma(tp);var al=qq('SELECT id,published_at FROM '+tp).all();r[tp]={active:al.filter(function(i){return Date.now()-new Date(i.published_at).getTime()<M*864e5}).length,archived:al.filter(function(i){return Date.now()-new Date(i.published_at).getTime()>=M*864e5}).length}});return jd(r)}
throw eh(404,'')
}catch(e){jr({error:e.message||''},e.statusCode||500,res)}});
sv.listen(pt,'127.0.0.1',function(){console.log('api v9 on '+pt)});
