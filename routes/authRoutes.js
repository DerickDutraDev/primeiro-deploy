// authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// As variáveis de ambiente não precisam ser importadas aqui,
// elas já estão disponíveis globalmente via process.env
// Remova as linhas abaixo, pois são redundantes
// const ACCESS_SECRET = process.env.ACCESS_SECRET;
// const REFRESH_SECRET = process.env.REFRESH_SECRET;
// const DEFAULT_USERNAME = process.env.DEFAULT_USERNAME;
// const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;

// Refresh tokens em memória (em produção, pode usar DB)
let refreshTokens = [];

module.exports = (supabase) => {

    // LOGIN
    router.post('/login', async (req, res) => {
        console.log("Rota POST /login acionada.");
        const { username, password } = req.body;
        if (!username || !password) {
            console.log("Dados de login ausentes. Retornando 400.");
            return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
        }

        try {
                const { data: users, error } = await supabase
                    .from('barbers')
                    .select('*')
                    .eq('username', username);
                    
                const user = users ? users[0] : null; // Pega o primeiro usuário do array, se existir

            if (error && error.code !== 'PGRST116') {
                console.error('Erro detalhado do Supabase na busca por usuário:', error);
                return res.status(500).json({ error: 'Erro interno na busca.' });
            }
            
            console.log("Busca no Supabase concluída. Analisando o resultado.");
            
            if (!user) {
                console.log("Usuário não encontrado no DB. Verificando credenciais padrão do .env.");
                if (username === process.env.DEFAULT_USERNAME && password === process.env.DEFAULT_PASSWORD) {
                    console.log("Login com credenciais padrão bem-sucedido.");
                    return createTokensAndRespond(username, res);
                }
                console.log("Usuário não encontrado ou credenciais inválidas.");
                return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
            }
            
            console.log("Usuário encontrado. Comparando a senha.");
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                console.log("Senha fornecida inválida.");
                return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
            }
            
            console.log("Senhas combinam. Login bem-sucedido.");
            createTokensAndRespond(user.username, res);

        } catch (err) {
            console.error('Erro inesperado na rota /login (bloco catch):', err);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // REFRESH TOKEN
    router.post('/refresh', (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken || !refreshTokens.includes(refreshToken)) {
            return res.status(403).json({ error: 'Refresh token inválido.' });
        }
        console.log("Rota /refresh acionada. Verificando token.");
        try {
            const data = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
            const accessToken = jwt.sign({ username: data.username }, process.env.ACCESS_SECRET, { expiresIn: '1h' });
            const newRefreshToken = jwt.sign({ username: data.username }, process.env.REFRESH_SECRET, { expiresIn: '20h' });

            refreshTokens = refreshTokens.filter(t => t !== refreshToken);
            refreshTokens.push(newRefreshToken);

            console.log("Token de acesso e refresh token atualizados com sucesso.");
            res.json({ accessToken, refreshToken: newRefreshToken });
        } catch {
            console.error("Erro ao verificar o refresh token.");
            res.status(403).json({ error: 'Token expirado ou inválido.' });
        }
    });

    // LOGOUT
    router.post('/logout', (req, res) => {
        const { refreshToken } = req.body;
        if (refreshToken) refreshTokens = refreshTokens.filter(t => t !== refreshToken);
        console.log("Logout bem-sucedido.");
        res.json({ message: 'Logout realizado com sucesso.' });
    });

    function createTokensAndRespond(username, res) {
        console.log("Criando tokens JWT para o usuário:", username);
        const accessToken = jwt.sign({ username }, process.env.ACCESS_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ username }, process.env.REFRESH_SECRET, { expiresIn: '20h' });
        refreshTokens.push(refreshToken);
        res.json({ accessToken, refreshToken, message: 'Login bem-sucedido.' });
    }

    return router;
};