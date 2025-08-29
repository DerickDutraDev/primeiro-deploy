// api/index.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const createAuthRoutes = require('./routes/authRoutes');
const createPublicQueueRoutes = require('./routes/publicQueueRoutes');
const createBarberApiRoutes = require('./routes/barberApiRoutes');
const authenticateToken = require('./middleware/authMiddleware');

console.log("Iniciando a API...");

// Inicialização Supabase
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Variáveis do Supabase não configuradas corretamente!");
}
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const app = express();
app.use(cors());
app.use(express.json());

// ✅ rota de healthcheck (pra ver se tá rodando na Vercel)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API está rodando 🚀' });
});

// Rotas da aplicação
app.use('/api/auth', createAuthRoutes(supabaseAdmin));
app.use('/api/public', createPublicQueueRoutes(supabaseAdmin));
app.use('/api/barber', authenticateToken, createBarberApiRoutes(supabaseAdmin));

console.log("Rotas configuradas.");

module.exports = serverless(app);
