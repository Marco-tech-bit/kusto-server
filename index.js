// =============================
// 🚀 KUSTO WEBHOOK SERVER - ENTERPRISE SECURE
// =============================

// npm install express cors body-parser firebase-admin express-rate-limit helmet

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// =============================
// 🛡️ SEGURANÇA BASE
// =============================

app.use(helmet()); // headers seguros
app.use(cors({
  origin: '*', // podes restringir depois
}));

app.use(bodyParser.json());

// =============================
// 🚫 RATE LIMIT (ANTI ATAQUE)
// =============================

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 pedidos por minuto
  message: 'Demasiadas requisições'
});

app.use(limiter);

// =============================
// 🔐 TOKENS POR DISPOSITIVO
// =============================

const TOKENS = {
  "POS_1": "KUSTO_SECURE_POS_1_X9#",
  "POS_2": "KUSTO_SECURE_POS_2_X9#"
};

// =============================
// 🌍 IP AUTORIZADO (OPCIONAL)
// =============================

const allowedIPs = []; // exemplo: ['196.xxx.xxx.xxx']

function validarIP(req) {
  if (allowedIPs.length === 0) return true;
  const ip = req.ip || req.connection.remoteAddress;
  return allowedIPs.includes(ip);
}

// =============================
// 🔑 VALIDAÇÃO CENTRAL
// =============================

function autenticar(req, res) {

  const token = req.headers.authorization;
  const device = req.headers['x-device-id'];

  if (!token || !device) {
    res.status(401).send('Sem autenticação');
    return false;
  }

  if (!TOKENS[device]) {
    res.status(403).send('Dispositivo inválido');
    return false;
  }

  if (TOKENS[device] !== token) {
    res.status(403).send('Token inválido');
    return false;
  }

  if (!validarIP(req)) {
    res.status(403).send('IP não autorizado');
    return false;
  }

  return true;
}

// =============================
// 🔥 FIREBASE
// =============================

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// =============================
// 📊 LOG SEGURO
// =============================

function log(tipo, data) {
  console.log('[' + new Date().toISOString() + '] ' + tipo, data || '');
}

// =============================
// 📥 WEBHOOK VENDAS
// =============================

app.post('/webhook-vendas', async (req, res) => {

  try {

    if (!autenticar(req, res)) return;

    const v = req.body;

    if (!v || !v.produto) {
      return res.status(400).send('Dados inválidos');
    }

    await db.collection('loja').add({
      produto: v.produto,
      quantidade: Number(v.quantidade) || 0,
      preco: Number(v.preco) || 0,
      operador: v.operador || 'desconhecido',
      turno: v.turno || 'N/A',
      dispositivo: req.headers['x-device-id'],
      data: new Date().toISOString()
    });

    log('VENDA', v.produto);

    res.sendStatus(200);

  } catch (e) {
    log('ERRO VENDA', e);
    res.sendStatus(500);
  }
});

// =============================
// ⛽ WEBHOOK DESCARGAS
// =============================

app.post('/webhook-descargas', async (req, res) => {

  try {

    if (!autenticar(req, res)) return;

    const d = req.body;

    await db.collection('descargas').add({
      quantidade: Number(d.quantidade) || 0,
      produto: d.produto || 'combustível',
      tanque: d.tanque || 'N/A',
      data: new Date().toISOString()
    });

    log('DESCARGA');

    res.sendStatus(200);

  } catch (e) {
    log('ERRO DESCARGA', e);
    res.sendStatus(500);
  }
});

// =============================
// 📊 WEBHOOK TOTALIZADORES
// =============================

app.post('/webhook-totalizadores', async (req, res) => {

  try {

    if (!autenticar(req, res)) return;

    const t = req.body;

    const inicio = Number(t.inicio) || 0;
    const fim = Number(t.fim) || 0;

    // 🚨 DETECÇÃO FRAUDE SIMPLES
    const diff = fim - inicio;

    if (diff < 0) {
      log('⚠ POSSÍVEL FRAUDE', t);
    }

    await db.collection('totalizadores').add({
      inicio: inicio,
      fim: fim,
      bomba: t.bomba || 'N/A',
      operador: t.operador || 'N/A',
      turno: t.turno || 'N/A',
      dispositivo: req.headers['x-device-id'],
      data: new Date().toISOString()
    });

    log('TOTALIZADOR', diff);

    res.sendStatus(200);

  } catch (e) {
    log('ERRO TOTALIZADOR', e);
    res.sendStatus(500);
  }
});

// =============================
// ❤️ HEALTH CHECK
// =============================

app.get('/', (req, res) => {
  res.send('KUSTO SECURE SERVER ONLINE');
});

// =============================
// 🚀 START
// =============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🔥 KUSTO ENTERPRISE SERVER ATIVO PORTA ' + PORT);
});
