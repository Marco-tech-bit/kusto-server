const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// 🔐 TOKEN DE SEGURANÇA
const TOKEN = "KUSTO_SECRET_123";

// 🔐 VALIDAÇÃO
function checkAuth(req,res){
var auth = req.headers["authorization"];
if(auth !== TOKEN){
res.status(403).send("Acesso negado");
return false;
}
return true;
}

// LOGIN
app.post("/login", (req, res) => {
var user = req.body.user;
var pass = req.body.pass;

if(user==="admin" && pass==="1234"){
return res.json({ok:true,role:"admin"});
}

if(user==="operador" && pass==="1234"){
return res.json({ok:true,role:"operador"});
}

res.json({ok:false});
});

// BASE
var dados = {
loja: [],
totalizadores: [],
descargas: []
};

// VENDAS
app.post("/webhook-vendas", (req,res)=>{
if(!checkAuth(req,res)) return;
dados.loja.push(req.body);
res.json({ok:true});
});

// TOTALIZADORES
app.post("/webhook-totalizadores", (req,res)=>{
if(!checkAuth(req,res)) return;
dados.totalizadores.push(req.body);
res.json({ok:true});
});

// DESCARGAS
app.post("/webhook-descargas", (req,res)=>{
if(!checkAuth(req,res)) return;
dados.descargas.push(req.body);
res.json({ok:true});
});

// API
app.get("/", (req,res)=>{
res.json(dados);
});

// STATUS
app.get("/status",(req,res)=>{
res.send("KUSTO SERVER SEGURO");
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
console.log("KUSTO SERVER ATIVO " + PORT);
});
