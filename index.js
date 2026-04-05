const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// 🔒 RATE LIMIT (ANTI-ATAQUE)
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100
});
app.use(limiter);

// 🔒 TOKEN OBRIGATÓRIO (SEM FALLBACK)
if (!process.env.TOKEN) {
    console.error("❌ TOKEN NÃO DEFINIDO NO RENDER");
    process.exit(1);
}

const TOKEN = process.env.TOKEN;

// 🔒 LOG DE SEGURANÇA
function logSecurity(req) {
    console.log("🔐 IP:", req.ip, "| TIME:", new Date().toISOString());
}

// 🔒 AUTH MIDDLEWARE
function checkAuth(req, res, next) {
    const auth = req.headers["authorization"];

    logSecurity(req);

    if (!auth) {
        return res.status(401).json({ erro: "Sem token" });
    }

    if (auth !== TOKEN) {
        return res.status(403).json({ erro: "Token inválido" });
    }

    next();
}

// 🧠 BASE TEMPORÁRIA (CONTROLADA)
let dados = {
    registros: []
};

// 🚀 ENDPOINT PRINCIPAL (KUSTO)
app.post("/kusto-data", checkAuth, function (req, res) {

    // 🔒 VALIDAR CONTENT-TYPE
    if (req.headers["content-type"] !== "application/json") {
        return res.status(400).json({ erro: "Content-Type inválido" });
    }

    // 🔒 VALIDAR BODY
    if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ erro: "Dados inválidos" });
    }

    // 🔒 PROTEÇÃO PAYLOAD
    if (JSON.stringify(req.body).length > 100000) {
        return res.status(413).json({ erro: "Payload muito grande" });
    }

    const payload = {
        data: new Date().toISOString(),
        origem: req.ip,
        conteudo: req.body
    };

    dados.registros.push(payload);

    console.log("📥 DADOS RECEBIDOS:");
    console.log(payload);

    res.json({ ok: true });
});

// 🔍 CONSULTA PROTEGIDA
app.get("/kusto-data", checkAuth, function (req, res) {
    res.json(dados);
});

// 🟢 STATUS SERVER
app.get("/status", function (req, res) {
    res.send("KUSTO SERVER SEGURO ATIVO");
});

// 🚀 START
const PORT = process.env.PORT || 3000;

app.listen(PORT, function () {
    console.log("🚀 KUSTO SERVER ATIVO NA PORTA " + PORT);
});
