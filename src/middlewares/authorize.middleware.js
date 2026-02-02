const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/security');
const JWT_SECRET = getJwtSecret();

// Middleware de autorização por roles
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Primeiro, verificar autenticação se req.user não existir
    if (!req.user) {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Token não fornecido'
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
        return res.status(401).json({
          success: false,
          message: 'Formato de token inválido'
        });
      }

      try {
        const decoded = jwt.verify(parts[1], JWT_SECRET);
        req.user = decoded;
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido ou expirado'
        });
      }
    }

    const userRole = req.user.role || req.user.funcao;
    console.log('👤 User role:', userRole, '| Allowed:', allowedRoles);

    if (!allowedRoles.includes(userRole)) {
      console.log('❌ Acesso negado');
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Você não tem permissão para acessar este recurso.',
        requiredRoles: allowedRoles,
        yourRole: userRole
      });
    }

    console.log('✅ Acesso permitido');
    next();
  };
};

module.exports = authorize;
