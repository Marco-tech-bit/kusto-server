// =============================
// 🚀 KUSTO SERVER (SAFE MODE)
// =============================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// =============================
// 🔐 SEGURANÇA
// =============================
const TOKEN = "KUSTO_SECRET_123";

// =============================
// 📥 WEBHOOK VENDAS (LOJA)
// =============================

app.post('/webhook-vendas', (req, res) => {

  try {

    const auth = req.headers.authorization;

    if (auth !== TOKEN) {
      return res.status(403).send('Acesso negado');
    }

    const venda = req.body;

    if (!venda || !venda.produto) {
      return res.status(400).send('Dados inválidos');
    }

    console.log('✅ Venda recebida:', venda);

    res.sendStatus(200);

  } catch (e) {
    console.error('Erro webhook vendas:', e);
    res.sendStatus(500);
  }

});

// =============================
// 📥 WEBHOOK DESCARGAS
// =============================

app.post('/webhook-descargas', (req, res) => {

  try {

    const auth = req.headers.authorization;

    if (auth !== TOKEN) {
      return res.status(403).send('Acesso negado');
    }

    const d = req.body;

    console.log('⛽ Descarga recebida:', d);

    res.sendStatus(200);

  } catch (e) {
    console.error('Erro webhook descargas:', e);
    res.sendStatus(500);
  }

});

// =============================
// 📥 WEBHOOK TOTALIZADORES
// =============================

app.post('/webhook-totalizadores', (req, res) => {

  try {

    const auth = req.headers.authorization;

    if (auth !== TOKEN) {
      return res.status(403).send('Acesso negado');
    }

    const t = req.body;

    console.log('📊 Totalizador recebido:', t);

    res.sendStatus(200);

  } catch (e) {
    console.error('Erro webhook totalizadores:', e);
    res.sendStatus(500);
  }

});

// =============================
// ❤️ HEALTH CHECK
// =============================

app.get('/', (req, res) => {
  res.send('KUSTO Webhook Server ON');
});

// =============================
// 🚀 START SERVER
// =============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🔥 KUSTO SERVER ATIVO NA PORTA ' + PORT);
});
