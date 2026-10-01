const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const s=http.createServer((q,r)=>fs.readFile(path.join(__dirname,'public',q.url==='/'?'index.html':q.url),(e,d)=>r.end(e?'Not Found':d)));
new WebSocketServer({server:s});
s.listen(process.env.PORT||3000,()=>console.log('Game server running'));
