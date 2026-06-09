import http from 'node:http';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

var _d=dirname(fileURLToPath(import.meta.url));
var dd=process.env.DATA_DIR||join(_d,'data');mkdirSync(dd,{recursive:true});
var db=new Database(process.env.DB_PATH||join(dd,'community.sqlite'));
db.pragma('journal_mode=WAL');db.pragma('foreign_keys=ON');
var pt=Number(process.env.PORT||18082);
var ae=new Set(['\ud83d\udc4d','\ud83d\udc4e','\u2764\ufe0f','\ud83d\ude02','\ud83d\ude2e','\ud83d\ude22','\ud83d\ude21','\ud83d\udc4f','\ud83d\ude4f','\ud83e\udd14','\ud83d\udc40','\ud83d\udd25','\ud83d\ude80','\ud83d\udcaf','\u2728','\ud83c\udf89','\ud83d\udca1','\ud83e\udde0','\ud83e\udee1','\ud83e\udd1d','\u2615','\ud83c\udf0a','\ud83e\udde9','\ud83d\udee0\ufe0f']);
db.exec(['CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,display_name TEXT NOT NULL,avatar_url TEXT NOT NULL DEFAULT \'\',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS reactions(type TEXT NOT NULL,item_id TEXT NOT NULL,user_id TEXT NOT NULL,emoji TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(type,item_id,user_id,emoji))',
'CREATE TABLE IF NOT EXISTS experiences(id TEXT PRIMARY KEY,type TEXT NOT NULL,item_id TEXT NOT NULL,user_id TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS news(id TEXT PRIMARY KEY,title TEXT NOT NULL,summary TEXT DEFAULT \'\',body TEXT DEFAULT \'\',source TEXT DEFAULT \'\',source_url TEXT DEFAULT \'\',author_id TEXT NOT NULL,category TEXT DEFAULT \'general\',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS tools(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT DEFAULT \'\',url TEXT DEFAULT \'\',author_id TEXT NOT NULL,tags TEXT DEFAULT \'\',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS discussions(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT DEFAULT \'\',author_id TEXT NOT NULL,category TEXT DEFAULT \'general\',published_at TEXT NOT NULL,archived INTEGER DEFAULT 0,created_at TEXT NOT NULL)',
'CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT DEFAULT \'\',author_id TEXT NOT NULL,tags TEXT DEFAULT \'\',status TEXT DEFAULT \'pending\',submitted_at TEXT NOT NULL,created_at TEXT NOT NULL)'].join(';'));
var p=function(s){return db.prepare(s)};
var s={};s.gu=p('SELECT*FROM users WHERE id=?');
s.uu=p('INSERT INTO users(id,display_name,avatar_url,created_at,updated_at)VALUES(?,?,?,?,?)ON CONFLICT(id)DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at');
s.gr=p('SELECT emoji,COUNT(*)cnt FROM reactions WHERE type=?AND item_id=?GROUP BY emoji');
s.gm=p('SELECT emoji FROM reactions WHERE type=?AND item_id=?AND user_id=?');
s.ar=p('INSERT OR IGNORE INTO reactions(type,item_id,user_id,emoji,created_at)VALUES(?,?,?,?,?)');
s.rr=p('DELETE FROM reactions WHERE type=?AND item_id=?AND user_id=?AND emoji=?');
s.ge=p('SELECT e.*,u.display_name,u.avatar_url FROM experiences e LEFT JOIN users u ON e.user_id=u.id WHERE e.type=?AND e.item_id=?ORDER BY e.created_at DESC');
s.ae=p('INSERT INTO experiences(id,type,item_id,user_id,body,created_at)VALUES(?,?,?,?,?,?)');
s.ce=p('SELECT COUNT(*)n FROM experiences WHERE type=?AND item_id=?');
s.tr=p('SELECT type,item_id,COUNT(*)total FROM reactions GROUP BY type,item_id ORDER BY total DESC LIMIT 20');
s.tt=p('SELECT e.type,e.item_id,COUNT(*)links FROM experiences e GROUP BY e.type,e.item_id ORDER BY links DESC LIMIT 10');
s.lk=p('SELECT*FROM content_links WHERE source_type=?AND source_id=?');
s.lc=p('SELECT COUNT(*)n FROM content_links WHERE target_type=?AND target_id=?');
s.la=p('INSERT INTO content_links(id,source_type,source_id,target_type,target_id,user_id,created_at)VALUES(?,?,?,?,?,?,?)');
function cr(t,o,a,i){return{li:p('SELECT t.*,u.display_name an FROM '+t+' t LEFT JOIN users u ON u.id=t.'+a+' ORDER BY t.'+o+' DESC LIMIT ? OFFSET ?'),ge:p('SELECT t.*,u.display_name an FROM '+t+' t LEFT JOIN users u ON u.id=t.'+a+' WHERE t.id=?'),cn:p('SELECT COUNT(*)n FROM '+t),de:p('DELETE FROM '+t+' WHERE id=?'),in:p(i)}};
var T={};T.news=cr('news','published_at','author_id','INSERT INTO news(id,title,summary,body,source,source_url,author_id,category,published_at,archived,created_at,updated_at)VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
T.tools=cr('tools','published_at','author_id','INSERT INTO tools(id,title,description,url,author_id,tags,published_at,archived,created_at)VALUES(?,?,?,?,?,?,?,?,?)');
T.disc=cr('discussions','published_at','author_id','INSERT INTO discussions(id,title,body,author_id,category,published_at,archived,created_at)VALUES(?,?,?,?,?,?,?,?)');
T.sub=cr('submissions','submitted_at','author_id','INSERT INTO submissions(id,title,body,author_id,tags,status,submitted_at,created_at)VALUES(?,?,?,?,?,?,?,?)');
function vi(r){var m=(r.headers.cookie||'').match(/sid=([^;]+)/);return m?m[1]:crypto.randomUUID()}
function eh(c,m){var e=new Error(m);e.statusCode=c;return e}
function rl(k,l,ms){var n=Date.now(),b=rateBuckets.get(k)||{c:0,r:n+ms};if(n>b.r){b.c=0;b.r=n+ms}b.c++;rateBuckets.set(k,b);if(b.c>l)throw eh(429,'')}
var rateBuckets={};
function jr(d,st,rs){rs.writeHead(st||200,{'Content-Type':'application/json'});rs.end(JSON.stringify(d))}
function aa(r){var x=(r.headers.authorization||'').replace('Bearer ','');if(!at||x!==at)throw eh(401,'')}
function ru(u){if(!u)throw eh(403,'\u8bf7\u5148\u4fdd\u5b58\u8eab\u4efd')}
function ma(t){return t==='news'?3:t==='discussions'?30:365}
function nw(){return new Date().toISOString()}
function hp(u){var nu=new URL(u,'http://localhost');return{p:nu.pathname,q:Object.fromEntries(nu.searchParams)}}
var sv=http.createServer(async function(req,res){
try{
var _p=hp(req.url),p=_p.p,q=_p.q,m=req.method;
var vid=vi(req);if(!(req.headers.cookie||'').includes('sid='))res.setHeader('Set-Cookie','sid='+vid+'; Path=/; SameSite=Lax; Max-Age=31536000');
var us=s.gu.get(vid);if(!us){var _n=nw();s.uu.run(vid,'\u8bbf\u5ba2-'+vid.slice(0,6),'',_n,_n);us=s.gu.get(vid)};
var body=null;try{if(m==='POST'||m==='PUT'){var B=[];req.on('data',function(d){B.push(d)});await new Promise(function(rs){req.on('end',rs);req.on('error',rs)});body=JSON.parse(Buffer.concat(B).toString())}}catch(e){throw eh(400,'')}
switch(p){
case'/api/health':if(m==='GET')return jr({ok:true},200,res);break;
case'/api/identity/manual':if(m==='POST'){rl('i'+vid,30,60000);var nm=(body.displayName||'').trim().slice(0,40);var av=(body.avatarUrl||'').trim().slice(0,300);if(!nm)throw eh(400,'');if(av&&!av.startsWith('https://'))throw eh(400,'');var _t=nw();s.uu.run(vid,nm,av,_t,_t);return jr({ok:true},200,res)}break;
case'/api/identity/status':if(m==='GET')return jr({needsName:false,displayName:us.display_name,avatarUrl:us.avatar_url},200,res);break;
case'/api/items':if(m==='GET'){var typ=q.type;if(!typ||!T[typ])throw eh(400,'');var li=Math.min(parseInt(q.limit)||50,100),of=parseInt(q.offset)||0,fi=q.filter||'all';var al=T[typ].li.all(li,of);var me=al.map(function(it){var rc={};var rr=s.gr.all(typ,it.id);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;it.reactions=rc;it.experienceCount=s.ce.get(typ,it.id).n;return it});return jr({items:me,total:T[typ].cn.get().n,limit:li,offset:of},200,res)}
if(m==='POST'){var typ=body.type;if(!typ||!T[typ])throw eh(400,'');ru(us);rl('c'+vid,6,60000);var ti=(body.title||'').trim();if(!ti||ti.length>120)throw eh(400,'');var id=crypto.randomUUID(),_n=nw();if(typ==='news'){T.news.in.run(id,ti,(body.summary||'').trim().slice(0,300),(body.body||'').trim().slice(0,8000),(body.source||'').trim().slice(0,100),(body.source_url||'').trim().slice(0,500),vid,(body.category||'general').trim().slice(0,50),_n,0,_n,_n)};if(typ==='tools'){T.tools.in.run(id,ti,(body.description||'').trim().slice(0,500),(body.url||'').trim().slice(0,500),vid,((body.tags||[]).join?body.tags.join(','):String(body.tags||'')).trim().slice(0,200),_n,0,_n)};if(typ==='discussions'){T.disc.in.run(id,ti,(body.body||'').trim().slice(0,8000),vid,(body.category||'general').trim().slice(0,50),_n,0,_n)};if(typ==='submissions'){T.sub.in.run(id,ti,(body.body||'').trim().slice(0,8000),vid,((body.tags||[]).join?body.tags.join(','):String(body.tags||'')).trim().slice(0,200),'visible',_n,_n)};return jr({id:id,type:typ},201,res)}
break;
default:var gM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)$/);if(!gM)throw eh(404,'');var ty=gM[1],id=gM[2];var TY=T[ty];if(!TY)throw eh(400,'');
if(m==='GET'){var it=TY.ge.get(id);if(!it)throw eh(404,'');var rc={};var rr=s.gr.all(ty,id);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;it.reactions=rc;it.experienceCount=s.ce.get(ty,id).n;it.linkCount=s.lc.get(ty,id).n;return jr(it,200,res)}
if(m==='DELETE'){aa(req);TY.de.run(id);p('DELETE FROM reactions WHERE type=?AND item_id=?').run(ty,id);p('DELETE FROM experiences WHERE type=?AND item_id=?').run(ty,id);return jr({ok:true},200,res)}
var rM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/reactions$/);if(rM){if(m==='GET'){var rc={};var rr=s.gr.all(ty,id);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;var mi=s.gm.all(ty,id,vid).map(function(r){return r.emoji});return jr({counts:rc,mine:mi},200,res)}if(m==='POST'){rl('r'+vid,60,60000);var em=(body.emoji||'').trim();if(!ae.has(em))throw eh(400,'');if(p('SELECT 1 FROM reactions WHERE type=?AND item_id=?AND user_id=?AND emoji=?').get(ty,id,vid,em)){s.rr.run(ty,id,vid,em)}else{s.ar.run(ty,id,vid,em,nw())};var rc={};var rr=s.gr.all(ty,id);for(var k=0;k<rr.length;k++)rc[rr[k].emoji]=rr[k].cnt;var mi=s.gm.all(ty,id,vid).map(function(r){return r.emoji});return jr({counts:rc,mine:mi},200,res)}}
var eM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/experiences$/);if(eM){if(m==='GET'){var exps=s.ge.all(ty,id).map(function(r){return{id:r.id,body:r.body,createdAt:r.created_at,displayName:r.display_name||'匿名',avatarUrl:r.avatar_url||''}});return jr({experiences:exps},200,res)}if(m==='POST'){rl('e'+vid,12,60000);ru(us);var tx=(body.body||'').trim();if(!tx)throw eh(400,'');if(tx.length>2000)throw eh(400,'');s.ae.run(crypto.randomUUID(),ty,id,vid,tx,nw());return jr({ok:true},201,res)}}
var lM=p.match(/^\/api\/items\/(\w+)\/([^\/]+)\/links$/);if(lM){if(m==='GET'){var links=s.lk.all(ty,id);return jr({links:links},200,res)}if(m==='POST'){rl('l'+vid,20,60000);if(!body.targetType||!body.targetId)throw eh(400,'');s.la.run(crypto.randomUUID(),ty,id,body.targetType,body.targetId,vid,nw());return jr({ok:true},201,res)}}
if(p==='/api/stats'){if(m==='GET')return jr({topReactions:s.tr.all(),trending:s.tt.all()},200,res);break}
if(p==='/api/links'){if(m==='GET'){var lt=q.type;var li=s.lk.all(lt||'',q.id||'');return jr({links:li},200,res)}if(m==='POST'){rl('l'+vid,20,60000);if(!body.sourceType||!body.sourceId||!body.targetType||!body.targetId)throw eh(400,'');s.la.run(crypto.randomUUID(),body.sourceType,body.sourceId,body.targetType,body.targetId,vid,nw());return jr({ok:true},201,res)}}
if(p==='/api/lifecycle'){if(m==='GET'){var r={};['news','discussions','tools'].forEach(function(tp){var M=ma(tp);var al=p('SELECT id,published_at FROM '+tp).all();r[tp]={active:al.filter(function(i){return Date.now()-new Date(i.published_at).getTime()<M*864e5}).length,archived:al.filter(function(i){return Date.now()-new Date(i.published_at).getTime()>=M*864e5}).length}});return jr(r,200,res)}break}
}
throw eh(404,'')
}catch(e){jr({error:e.message||''},e.statusCode||500,res)}});
sv.listen(pt,'127.0.0.1',function(){console.log('api v5 on '+pt)});