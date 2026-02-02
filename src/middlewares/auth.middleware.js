const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const JWT_SECRET = getJwtSecret();

const authMiddleware = (req, res, next) => {
  try {
    // Pegar o token do header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido'
      });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({
        success: false,
        message: 'Token mal formatado'
      });
    }

    // Verificar o token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }

      // Adicionar informações do usuário na requisição
      req.user = {
        id: decoded.id,
        nome: decoded.nome,
        email: decoded.email,
        funcao: decoded.funcao,
        role: decoded.role || decoded.funcao || 'funcionario'
      };

      return next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Erro na autenticação',
      error: error.message
    });
  }
};

module.exports = authMiddleware;
