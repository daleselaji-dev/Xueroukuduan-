import re
with open("/opt/flesh-is-weak-seminar/api/server.js") as f:
    c = f.read()
# Fix: move function j before try block
c = c.replace(
    'var sv=http.createServer(async function(req,res){try{',
    'var sv=http.createServer(async function(req,res){\nfunction j(d,st){res.writeHead(st||200,{"Content-Type":"application/json"});res.end(JSON.stringify(d))}\ntry{'
)
# Remove the duplicate j inside try
c = c.replace(
    '\nfunction j(d,st){res.writeHead(st||200,{\'Content-Type\':\'application/json\'});res.end(JSON.stringify(d))}',
    '',
    1
)
# Fix JSON quotes: change single quotes inside JSON to double quotes
c = c.replace("{\\'Content-Type\\':\\'application/json\\'}", '{"Content-Type":"application/json"}')
with open("/opt/flesh-is-weak-seminar/api/server.js", "w") as f:
    f.write(c)
print("fixed")