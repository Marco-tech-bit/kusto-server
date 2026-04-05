const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 10000;
const TOKEN = process.env.TOKEN || "KUSTO_SECURE_DEFAULT";

// 🔒 Limite payload
app.use(express.json({limit:"1mb"}));

// ================= DB =================
const DB_FILE = path.join(__dirname,"kusto-db.json");

function carregarDB(){
try{
if(!fs.existsSync(DB_FILE)){
fs.writeFileSync(DB_FILE, JSON.stringify({registos:[]}, null, 2));
}
return JSON.parse(fs.readFileSync(DB_FILE));
}catch(e){
console.log("ERRO DB LOAD", e);
return {registos:[]};
}
}

function salvarDB(db){
try{
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}catch(e){
console.log("ERRO DB SAVE", e);
}
}

// ================= RATE LIMIT (ANTI ATAQUE) =================
var requests = {};

function rateLimit(req,res,next){
var ip = req.ip;
var now = Date.now();

if(!requests[ip]) requests[ip]=[];

requests[ip] = requests[ip].filter(function(t){
return now - t < 60000;
});

if(requests[ip].length > 60){
console.log("🚫 RATE LIMIT:", ip);
return res.status(429).json({ok:false,erro:"too_many_requests"});
}

requests[ip].push(now);
next();
}

app.use(rateLimit);

// ================= VALIDAÇÃO =================
function validarPayload(body){

if(!body) return false;

if(typeof body.vendas !== "number") return false;
if(typeof body.descargas !== "number") return false;
if(typeof body.tanques !== "object") return false;

return true;
}

// ================= AUTH =================
function auth(req,res,next){

var token = req.headers["authorization"];

if(!token){
console.log("❌ TOKEN AUSENTE");
return res.status(401).json({ok:false,erro:"no_token"});
}

if(token !== TOKEN){
console.log("❌ TOKEN INVÁLIDO:", token);
return res.status(403).json({ok:false,erro:"invalid_token"});
}

next();
}

// ================= STATUS =================
app.get("/status",(req,res)=>{
res.json({
ok:true,
server:"KUSTO",
time:new Date().toISOString()
});
});

// ================= RECEBER =================
app.post("/kusto-data", auth, (req,res)=>{

console.log("📥 NOVO PEDIDO");

if(!validarPayload(req.body)){
console.log("❌ DADOS INVÁLIDOS");
return res.status(400).json({ok:false,erro:"invalid_payload"});
}

var db = carregarDB();

var novo = {
id: Date.now(),
data: new Date().toISOString(),
ip: req.ip,
conteudo: req.body
};

db.registos.push(novo);

// 🔒 limite histórico
if(db.registos.length > 5000){
db.registos.shift();
}

salvarDB(db);

console.log("✅ DADOS GUARDADOS:", novo.id);

res.json({
ok:true,
id:novo.id
});

});

// ================= CONSULTA =================
app.get("/kusto-dados", auth, (req,res)=>{

var db = carregarDB();

res.json({
ok:true,
total:db.registos.length,
dados:db.registos
});

});

// ================= START =================
app.listen(PORT,()=>{
console.log("🚀 KUSTO SERVER ATIVO NA PORTA",PORT);
});
