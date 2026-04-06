const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 10000;
const TOKEN = process.env.TOKEN || "KUSTO_SECURE_DEFAULT";

// 🔒 Limite payload
app.use(express.json({limit:"1mb"}));

// 🔒 CORS (necessário para browser)
app.use(function(req,res,next){
res.header("Access-Control-Allow-Origin","*");
res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept, Authorization");
res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");
if(req.method === "OPTIONS"){ return res.sendStatus(200); }
next();
});

// ================= CAMINHOS =================
const DB_FILE = path.join(__dirname,"kusto-db.json");
const BACKUP_FILE = path.join(__dirname,"kusto-backup.json");

// ================= DB =================
function carregarDB(){
try{
if(!fs.existsSync(DB_FILE)){
fs.writeFileSync(DB_FILE, JSON.stringify({registos:[]}, null, 2));
}
return JSON.parse(fs.readFileSync(DB_FILE));
}catch(e){
console.log("⚠ ERRO DB LOAD, criando novo:", e);
return {registos:[]};
}
}

// 🔥 BACKUP AUTOMÁTICO
function salvarDB(db){
try{

// guarda principal
fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

// guarda backup (sempre atualizado)
fs.writeFileSync(BACKUP_FILE, JSON.stringify(db, null, 2));

// snapshot de segurança (1 por hora)
var hora = new Date().toISOString().slice(0,13).replace(/:/g,"-");
var SNAP_FILE = path.join(__dirname,"snap-"+hora+".json");

if(!fs.existsSync(SNAP_FILE)){
fs.writeFileSync(SNAP_FILE, JSON.stringify(db, null, 2));
}

}catch(e){
console.log("❌ ERRO DB SAVE", e);
}
}

// ================= RATE LIMIT =================
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

var token = req.headers["authorization"] || req.headers["Authorization"];

if(!token){
console.log("❌ TOKEN AUSENTE");
return res.status(401).json({ok:false});
}

if(token !== TOKEN){
console.log("❌ TOKEN INVÁLIDO:", token);
return res.status(403).json({ok:false});
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
return res.status(400).json({ok:false});
}

var db = carregarDB();

var novo = {
id: Date.now(),
data: new Date().toISOString(),
ip: req.ip,
conteudo: req.body
};

// 🔥 NÃO APAGA MAIS HISTÓRICO (REMOVIDO SHIFT)
// apenas limita de forma segura (opcional futuro)

db.registos.push(novo);

// guardar com backup
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
console.log("🚀 KUSTO SERVER BLINDADO NA PORTA",PORT);
});
