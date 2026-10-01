const http=require('http');
const fs=require('fs');
const path=require('path');
const {WebSocketServer}=require('ws');

const server=http.createServer((req,res)=>{
 let file=req.url==='/'?'index.html':req.url;
 fs.readFile(path.join(__dirname,'public',file),(e,d)=>{
  if(e){res.statusCode=404;return res.end('Not Found')}
  res.end(d);
 });
});

const wss=new WebSocketServer({server});
const rooms=new Map();

wss.on('connection',ws=>{
 ws.on('message',msg=>{
  // 2〜4人オンライン対戦処理用
  ws.send(JSON.stringify({type:'connected'}));
 });
});

server.listen(process.env.PORT||3000,()=>console.log('Game server running'));
