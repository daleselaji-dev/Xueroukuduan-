import http from 'node:http';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var _d=dirname(fileURLToPath(import.meta.url));
var dd=process.env.DATA_DIR||join(_d,'data');
mkdirSync(dd,{recursive:true});
var db=new Database(process.env.DB_PATH||join(dd,'community.sqlite'));
db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');
var pt=Number(process.env.PORT||18082);
var at=process.env.ADMIN_TOKEN||'';
var ae=new Set(['\ud83d\udc4d','\ud83d\udc4e','\u2764\ufe0f','\ud83d\ude02','\ud83d\ude2e','\ud83d\ude22','\ud83d\ude21','\ud83d\udc4f','\ud83d\ude4f','\ud83e\udd14','\ud83d\udc40','\ud83d\udd25','\ud83d\ude80','\ud83d\udcaf','\u2728','\ud83c\udf89','\ud83d\udca1','\ud83e\udde0','\ud83e\udee1','\ud83e\udd1d','\u2615','\ud83c\udf0a','\ud83e\udde9','\ud83d\udee0\ufe0f']);var rB=new Map();
var SCHEMA="CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,display_name TEXT NOT NULL,avatar_url TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS reactions (type TEXT NOT NULL,item_id TEXT NOT NULL,user_id TEXT NOT NULL,emoji TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(type,item_id,user_id,emoji));\nCREATE TABLE IF NOT EXISTS experiences (id TEXT PRIMARY KEY,type TEXT NOT NULL,item_id TEXT NOT NULL,user_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY,title TEXT NOT NULL,summary TEXT DEFAULT '',body TEXT DEFAULT '',source TEXT DEFAULT '',source_url TEXT DEFAULT '',author_id TEXT NOT NULL,category TEXT DEFAULT 'general',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS tools (id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT DEFAULT '',url TEXT DEFAULT '',author_id TEXT NOT NULL,tags TEXT DEFAULT '',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS discussions (id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT DEFAULT '',author_id TEXT NOT NULL,category TEXT DEFAULT 'general',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL);\nCREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT DEFAULT '',author_id TEXT NOT NULL,tags TEXT DEFAULT '',status TEXT DEFAULT 'pending',submitted_at TEXT NOT NULL,created_at TEXT NOT NULL);";db.exec(SCHEMA);
var p=function(s){return db.prepare(s)};
var st={};
st.gu=p('SELECT * FROM users WHERE id=?');
st.uu=p('INSERT INTO users(id,display_name,avatar_url,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at');
st.gr=p('SELECT emoji,COUNT(*)as cnt FROM reactions WHERE type=? AND item_id=? GROUP BY emoji');
st.gm=p('SELECT emoji FROM reactions WHERE type=? AND item_id=? AND user_id=?');
st.ar=p('INSERT OR IGNORE INTO reactions(type,item_id,user_id,emoji,created_at) VALUES(?,?,?,?,?)');
st.rr=p('DELETE FROM reactions WHERE type=? AND item_id=? AND user_id=? AND emoji=?');
st.ge=p('SELECT e.*,u.display_name,u.avatar_url FROM experiences e LEFT JOIN users u ON e.user_id=u.id WHERE e.type=? AND e.item_id=? ORDER BY e.created_at DESC');
st.ae=p('INSERT INTO experiences(id,type,item_id,user_id,body,created_at) VALUES(?,?,?,?,?,?)');
st.ce=p('SELECT COUNT(*)n FROM experiences WHERE type=? AND item_id=?');
st.tr=p('SELECT type,item_id,COUNT(*)as total FROM reactions GROUP BY type,item_id ORDER BY total DESC LIMIT 20');
st.tt=p('SELECT e.type,e.item_id,COUNT(*)as links FROM experiences e GROUP BY e.type,e.item_id ORDER BY links DESC LIMIT 10');
function cr(t,of,af,is){return{li:p('SELECT t.*,u.display_name as an FROM '+t+' t LEFT JOIN users u ON u.id=t.'+af+' ORDER BY t.'+of+' DESC LIMIT ? OFFSET ?'),ge:p('SELECT t.*,u.display_name as an FROM '+t+' t LEFT JOIN users u ON u.id=t.'+af+' WHERE t.id=?'),cn:p('SELECT COUNT(*)n FROM '+t),de:p('DELETE FROM '+t+' WHERE id=?'),in:p(is)}};
var T={};
T.news=cr('news','published_at','author_id','INSERT INTO news(id,title,summary,body,source,source_url,author_id,category,published_at,archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
T.tools=cr('tools','published_at','author_id','INSERT INTO tools(id,title,description,url,author_id,tags,published_at,archived,created_at) VALUES(?,?,?,?,?,?,?,?,?)');
T.discussions=cr('discussions','published_at','author_id','INSERT INTO discussions(id,title,body,author_id,category,published_at,archived,created_at) VALUES(?,?,?,?,?,?,?,?)');
T.submissions=cr('submissions','submitted_at','author_id','INSERT INTO submissions(id,title,body,author_id,tags,status,submitted_at,created_at) VALUES(?,?,?,?,?,?,?,?)');
function vi(r){var m=(r.headers.cookie||'').match(/sid=([^;]+)/);return m?m[1]:crypto.randomUUID()}
function eh(c,m){var e=new Error(m);e.statusCode=c;return e}
function rl(k,l,ms){var n=Date.now(),b=rB.get(k)||{c:0,r:n+ms};if(n>b.r){b.c=0;b.r=n+ms}b.c++;rB.set(k,b);if(b.c>l)throw eh(429,'tm')}
function pb(r){return new Promise(function(res,rej){var B=[];var S=0;r.on('data',function(d){S+=d.length;if(S>16384)rej(eh(413,''));B.push(d)});r.on('end',function(){try{res(JSON.parse(Buffer.concat(B).toString()))}catch{rej(eh(400,''))}});r.on('error',rej)})}
function jr(d,st,rs){rs.writeHead(st||200,{'Content-Type':'application/json'});rs.end(JSON.stringify(d))}
function aa(r){var t=(r.headers.authorization||'').replace('Bearer ','');if(!at||t!==at)throw eh(401,'')}
function ru(u){if(!u)throw eh(403,'\u8bf7\u5148\u4fdd\u5b58')}
function ma(t){return t==='news'?2:t==='discussions'?30:365}
function nw(){var d=new Date();return d.toISOString()}
function pu(u){var nu=new URL(u,'http://localhost');return{p:nu.pathname,q:Object.fromEntries(nu.searchParams)}}
var sv=http.createServer(async function(req,res){try{
var _p=pu(req.url),p=_p.p,q=_p.q,m=req.method;
var vid=vi(req);if(!(req.headers.cookie||'').includes('sid='))res.setHeader('Set-Cookie','sid='+vid+'; Path=/; SameSite=Lax; Max-Age=31536000');
var us=st.gu.get(vid);if(!us){var _n=nw();st.uu.run(vid,'访客-'+vid.slice(0,6),'',_n,_n);us=st.gu.get(vid)};
function j(d,st){res.writeHead(st||200,{'Content-Type':'application/json'});res.end(JSON.stringify(d))}
if(p==='/api/health'&&m==='GET')return j({ok:true})
if(p==='/api/identity/manual'&&m==='POST'){rl('i'+vid,30,60000);var b=await pb(req);var nm=(b.displayName||'').trim().slice(0,40),av=(b.avatarUrl||'').trim().slice(0,300);if(!nm)throw eh(400,'昵称不能为空');if(av&&!av.startsWith('https://'))throw eh(400,'av');var _t=nw();st.uu.run(vid,nm,av,_t,_t);us=st.gu.get(vid);return j({ok:true,displayName:us.display_name})}
if(p==='/api/identity/status'&&m==='GET')return j({needsName:false,displayName:us.display_name,avatarUrl:us.avatar_url,wechatEnabled:false})
if(p==='/api/items'&&m==='GET'){var typ=q.type;if(!typ||!['news','tools','discussions','submissions'].includes(typ))throw eh(400,'type');var li=Math.min(parseInt(q.limit)||50,100),of=parseInt(q.offset)||0,fi=q.filter||'all';var al=T[typ].li.all(li,of),to=T[typ].cn.get().n;var it=al;if(fi==='active'){var M=ma(typ);it=al.filter(function(i){return Date.now()-new Date(i.published_at||i.submitted_at).getTime()<M*864e5})}else if(fi==='archived'){var M=ma(typ);it=al.filter(function(i){return Date.now()-new Date(i.published_at||i.submitted_at).getTime()>=M*864e5})}var me=it.map(function(itm){var rc={};var rr=st.gr.all(typ,itm.id);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;return Object.assign({},itm,{reactions:rc,experienceCount:st.ce.get(typ,itm.id).n})});return j({items:me,total:to,limit:li,offset:of})}
if(p==='/api/items'&&m==='POST'){var b=await pb(req);var typ=b.type;if(!typ||!['news','tools','discussions','submissions'].includes(typ))throw eh(400,'type');ru(us);rl('c'+vid,6,60000);var ti=(b.title||'').trim();if(!ti||ti.length>120)throw eh(400,'标题');var id=crypto.randomUUID(),_n=nw();if(typ==='news'){T.news.in.run(id,ti,(b.summary||'').trim().slice(0,300),(b.body||'').trim().slice(0,8000),(b.source||'').trim().slice(0,100),(b.source_url||'').trim().slice(0,500),vid,(b.category||'general').trim().slice(0,50),_n,0,_n,_n)};if(typ==='tools'){T.tools.in.run(id,ti,(b.description||'').trim().slice(0,500),(b.url||'').trim().slice(0,500),vid,((b.tags||[]).join?b.tags.join(','):String(b.tags||'')).trim().slice(0,200),_n,0,_n)};if(typ==='discussions'){T.discussions.in.run(id,ti,(b.body||'').trim().slice(0,8000),vid,(b.category||'general').trim().slice(0,50),_n,0,_n)};if(typ==='submissions'){T.submissions.in.run(id,ti,(b.body||'').trim().slice(0,8000),vid,((b.tags||[]).join?b.tags.join(','):String(b.tags||'')).trim().slice(0,200),'visible',_n,_n)};return j({id:id,type:typ},201)}
var gM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)$/);var ty=gM?gM[1]:'';var iid=gM?gM[2]:'';
var rM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/reactions$/);
var eM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/experiences$/);
if(gM&&!rM&&!eM&&m==='GET'){if(!['news','tools','discussions','submissions'].includes(ty))throw eh(400,'');var it=T[ty].ge.get(iid);if(!it)throw eh(404,'');var rc={};var rr=st.gr.all(ty,iid);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;return j(Object.assign({},it,{reactions:rc,experienceCount:st.ce.get(ty,iid).n}))}
if(gM&&!rM&&!eM&&m==='DELETE'){aa(req);T[ty].de.run(iid);p('DELETE FROM reactions WHERE type=? AND item_id=?').run(ty,iid);p('DELETE FROM experiences WHERE type=? AND item_id=?').run(ty,iid);return j({ok:true})}
if(rM){if(m==='GET'){var rc={};var rr=st.gr.all(ty,iid);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;var mi=st.gm.all(ty,iid,vid).map(function(r){return r.emoji});return j({counts:rc,mine:mi})}
if(m==='POST'){rl('r'+vid,60,60000);var b=await pb(req),em=(b.emoji||'').trim();if(!ae.has(em))throw eh(400,'em');if(p('SELECT 1 FROM reactions WHERE type=? AND item_id=? AND user_id=? AND emoji=?').get(ty,iid,vid,em))st.rr.run(ty,iid,vid,em);else st.ar.run(ty,iid,vid,em,nw());var rc={};var rr=st.gr.all(ty,iid);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;var mi=st.gm.all(ty,iid,vid).map(function(r){return r.emoji});return j({counts:rc,mine:mi})}}
if(eM){if(m==='GET'){var exps=st.ge.all(ty,iid).map(function(r){return{id:r.id,body:r.body,createdAt:r.created_at,displayName:r.display_name||'匿名',avatarUrl:r.avatar_url||''}});return j({experiences:exps})}
if(m==='POST'){rl('e'+vid,12,60000);ru(us);var b=await pb(req),tx=(b.body||'').trim();if(!tx)throw eh(400,'内容不能为空');if(tx.length>2000)throw eh(400,'内容过长');st.ae.run(crypto.randomUUID(),ty,iid,vid,tx,nw());return j({ok:true})}}
if(p==='/api/stats'&&m==='GET')return j({topReactions:st.tr.all(),trending:st.tt.all()})
if(p==='/api/lifecycle'&&m==='GET'){var r={};['news','discussions','tools'].forEach(function(t){var M=ma(t);var al=p('SELECT id,published_at FROM '+t).all();r[t]={active:al.filter(function(i){return Date.now()-new Date(i.published_at).getTime()<M*864e5}).length,archived:al.filter(function(i){return Date.now()-new Date(i.published_at).getTime()>=M*864e5}).length}});return j(r)}
throw eh(404,'')
}catch(e){j({error:e.message||''},e.statusCode||500)}});
sv.listen(pt,'127.0.0.1',function(){console.log('api v2 on '+pt)});