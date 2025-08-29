// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    console.log("Middleware de autenticação iniciado.");
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log("Token de autenticação não fornecido.");
        return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    try {
        console.log("Verificando token JWT.");
        const user = jwt.verify(token, process.env.ACCESS_SECRET);
        req.user = user;
        console.log("Token verificado com sucesso.");
        next();
    } catch (err) {
        console.error("Erro na verificação do token:", err.message);
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

module.exports = authenticateToken;