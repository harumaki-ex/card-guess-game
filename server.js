const http=require("http");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const WebSocket=require("ws");

const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,"public");
const rooms=new Map();
const PATTERNS=16;

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeCode(){
 let c;do{c=crypto.randomBytes(3).toString("hex").toUpperCase()}while(rooms.has(c));
 return c;
}
function newGame(names){
 let d=[];for(let i=0;i<PATTERNS;i++)d.push(i,i);shuffle(d);
 return {
   deck:d,
   players:[
     {name:names[0],hand:d.splice(0,4),score:0},
     {name:names[1],hand:d.splice(0,4),score:0}
   ],
   turn:0,ended:false
 };
}
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))}
function publicState(r,viewer){
 const me=r.game.players[viewer],opp=r.game.players[1-viewer];
 return {
   me:{name:me.name,hand:me.hand,score:me.score},
   opp:{name:opp.name,handCount:opp.hand.length,score:opp.score},
   turn:r.game.turn,
   deckCount:r.game.deck.length
 };
}
function broadcastState(r){
 r.clients.forEach((ws,i)=>send(ws,{type:"state",state:publicState(r,i)}));
}
function log(r,text){r.clients.forEach(ws=>send(ws,{type:"log",text}))}
function refill(g,p){
 if(g.players[p].hand.length===0){
   for(let i=0;i<4&&g.deck.length;i++)g.players[p].hand.push(g.deck.pop());
   return true;
 }
 return false;
}
function checkEnd(r){
 const g=r.game;
 if(g.deck.length===0 && (g.players[0].hand.length===0 || g.players[1].hand.length===0)){
   g.ended=true;
   const a=g.players[0].score,b=g.players[1].score;
   let title=a>b?"プレイヤー1の勝利！":a<b?"プレイヤー2の勝利！":"引き分け！";
   const detail=`${g.players[0].name}：${a}ポイント　―　${g.players[1].name}：${b}ポイント`;
   r.clients.forEach((ws,i)=>{
     let personal=a===b?"引き分け！":(a>b)===(i===0)?"あなたの勝利！":"あなたの敗北…";
     send(ws,{type:"finished",title:personal,detail});
   });
   rooms.delete(r.code);
   return true;
 }
 return false;
}

const server=http.createServer((req,res)=>{
 let u=(req.url||"/").split("?")[0];
 if(u==="/")u="/index.html";
 const file=path.normalize(path.join(PUBLIC,u));
 if(!file.startsWith(PUBLIC)){res.writeHead(403);return res.end("Forbidden")}
 fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404);return res.end("Not Found")}
   const ext=path.extname(file);
   const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"};
   res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream"});
   res.end(data);
 });
});
const wss=new WebSocket.Server({server});

wss.on("connection",ws=>{
 ws.on("message",raw=>{
   let m;try{m=JSON.parse(raw)}catch{return}

   if(m.type==="create"){
     const name=String(m.name||"プレイヤー1").slice(0,16);
     const code=makeCode();
     const r={code,clients:[ws],names:[name],game:null};
     rooms.set(code,r);ws.room=code;ws.player=0;
     send(ws,{type:"created",code});
     return;
   }

   if(m.type==="join"){
     const code=String(m.code||"").toUpperCase();
     const r=rooms.get(code);
     if(!r){send(ws,{type:"error",message:"そのルームは存在しません。"});return}
     if(r.clients.length>=2||r.game){send(ws,{type:"error",message:"そのルームは満員です。"});return}
     const name=String(m.name||"プレイヤー2").slice(0,16);
     r.clients.push(ws);r.names.push(name);
     ws.room=code;ws.player=1;
     r.game=newGame(r.names);
     r.clients.forEach((c,i)=>send(c,{type:"started",player:i,state:publicState(r,i)}));
     log(r,"対戦開始！");
     return;
   }

   if(m.type==="guess"){
     const r=rooms.get(ws.room);if(!r||!r.game||r.game.ended)return;
     const g=r.game,p=ws.player;
     if(g.turn!==p)return;
     const me=g.players[p],opp=g.players[1-p];
     const oi=Number(m.oppIndex),mi=Number(m.myIndex),guess=Number(m.pattern);
     if(!Number.isInteger(oi)||!Number.isInteger(mi)||!Number.isInteger(guess))return;
     if(oi<0||oi>=opp.hand.length||mi<0||mi>=me.hand.length||guess<0||guess>=16)return;

     if(opp.hand[oi]===guess){
       opp.hand.splice(oi,1);me.hand.splice(mi,1);me.score++;
       log(r,`${me.name}が正解！ 1ポイント獲得！`);
       refill(g,p);refill(g,1-p);
     }else{
       if(g.deck.length)me.hand.push(g.deck.pop());
       log(r,`${me.name}はハズレ。1枚ドロー。`);
     }

     if(checkEnd(r))return;
     g.turn=1-p;
     broadcastState(r);
   }
 });

 ws.on("close",()=>{
   const code=ws.room,r=rooms.get(code);
   if(!r)return;
   r.clients=r.clients.filter(c=>c!==ws);
   if(r.clients.length===0){rooms.delete(code);return}
   r.clients.forEach(c=>send(c,{type:"opponent_left"}));
   rooms.delete(code);
 });
});

server.listen(PORT,()=>console.log(`Game server running on port ${PORT}`));