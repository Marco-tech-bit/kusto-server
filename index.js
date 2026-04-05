const express = require("express");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();

// ================= 🔐 SEGURANÇA BASE =================

// limitar tamanho
app.use(express.json({ limit: "1mb" }));

// rate limit (anti ataque)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: { ok: false, erro: "Too many requests" }
});
app.use(limiter);

// ================= 📁 DB =================

const DB_FILE = path.join(__dirname, "kusto-db.json");

function carregarDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ registos: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE));
  } catch (e) {
    return { registos: [] };
  }
}

function salvarDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ================= 🧠 VALIDAÇÃO =================

function validarPayload(body) {

  if (!body) return false;

  if (typeof body.vendas !== "number") return false;
  if (typeof body.descargas !== "number") return false;

  if (body.vendas < 0 || body.descargas < 0) return false;

  if (body.vendas > 1000000 || body.descargas > 1000000) return false;

  if (typeof body.tanques !== "object") return false;

  return true;
}

// ================= 🔐 TOKEN =================

function validarToken(req) {
  const token = req.headers["authorization"];
  return token && token === process.env.TOKEN;
}

// ================= 🚀 POST =================

app.post("/kusto-data", (req, res) => {

  if (!validarToken(req)) {
    console.log("❌ TOKEN INVÁLIDO");
    return res.status(403).json({ ok: false });
  }

  if (!validarPayload(req.body)) {
    console.log("❌ DADOS INVÁLIDOS");
    return res.status(400).json({ ok: false });
  }

  const db = carregarDB();

  const novo = {
    id: Date.now(),
    data: new Date().toISOString(),
    ip: req.ip,
    conteudo: req.body
  };

  db.registos.push(novo);

  // limitar histórico
  if (db.registos.length > 5000) {
    db.registos.shift();
  }

  salvarDB(db);

  console.log("📥 DADOS GUARDADOS:", novo.id);

  res.json({ ok: true });
});

// ================= 🔐 GET PROTEGIDO =================

app.get("/kusto-dados", (req, res) => {

  if (!validarToken(req)) {
    return res.status(403).json({ ok: false });
  }

  const db = carregarDB();

  res.json(db);
});

// ================= ❤️ STATUS =================

app.get("/status", (req, res) => {
  res.send("KUSTO SERVER SEGURO ATIVO");
});

// ================= 🚀 START =================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("KUSTO SERVER ATIVO NA PORTA", PORT);
});
