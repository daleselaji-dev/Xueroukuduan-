import re
fn = "/opt/flesh-is-weak-seminar/api/server.js"
with open(fn) as f: c = f.read()

# Add content_links table to SCHEMA
link_tbl = '"CREATE TABLE IF NOT EXISTS content_links (id TEXT PRIMARY KEY,source_type TEXT NOT NULL,source_id TEXT NOT NULL,target_type TEXT NOT NULL,target_id TEXT NOT NULL,user_id TEXT NOT NULL,created_at TEXT NOT NULL);"'
# Find the last CREATE TABLE entry
idx = c.rfind("CREATE TABLE IF NOT EXISTS submissions")
if idx > 0:
    eol = c.find("\n", idx)
    c = c[:eol+1] + '  ' + link_tbl + ',\n' + c[eol+1:]

# Add link prepared statements
c = c.replace(
    "var sv=http.createServer",
    "st.lk=p('SELECT * FROM content_links WHERE source_type=? AND source_id=?');st.lc=p('SELECT COUNT(*)n FROM content_links WHERE target_type=? AND target_id=?');st.la=p('INSERT INTO content_links(id,source_type,source_id,target_type,target_id,user_id,created_at) VALUES(?,?,?,?,?,?,?)');var sv=http.createServer"
)

# Add GET /api/links and POST /api/links routes
c = c.replace(
    "if(p==='/api/lifecycle",
    "if(p==='/api/links'&&m==='GET'){var lt=q.type;var li=st.lk.all(lt,q.id||'');return j({links:li})};if(p==='/api/links'&&m==='POST'){var B=await pb(req);rl('l'+vid,20);st.la.run(crypto.randomUUID(),B.source.type,B.source.id,B.target.type,B.target.id,vid,nw());return j({},201)};if(p==='/api/lifecycle"
)

with open(fn, "w") as f: f.write(c)
print("OK")