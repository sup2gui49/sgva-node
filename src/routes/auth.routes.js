const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Garantir que rotas e middleware usem o mesmo segredo
const { getJwtSecret } = require('../config/security');
const JWT_SECRET = getJwtSecret();

const ROLE_EXPIRY = {
  admin: process.env.JWT_EXPIRES_ADMIN || '8h',
  gerente: process.env.JWT_EXPIRES_GERENTE || '6h',
  funcionario: process.env.JWT_EXPIRES_FUNCIONARIO || '4h'
};

function getRoleExpiry(role) {
  const normalized = String(role || '').toLowerCase();
  return ROLE_EXPIRY[normalized] || process.env.JWT_EXPIRES_IN || '6h';
}

// Verificar se existem usuários no sistema
router.get('/check-users', (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as total FROM usuarios').get();
    res.json({
      success: true,
      hasUsers: count.total > 0,
      totalUsers: count.total
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar usuários',
      error: error.message
    });
  }
});

// Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const { nome, email, senha, funcao, role } = req.body;

    // Validação
    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }

    // Verificar se email já existe
    const userExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email já cadastrado'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Inserir usuário (usando role em vez de funcao)
    const userRole = role || funcao || 'usuario';
    const result = db.prepare(`
      INSERT INTO usuarios (nome, email, senha, role, funcao)
      VALUES (?, ?, ?, ?, ?)
    `).run(nome, email, senhaHash, userRole, userRole);

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso!',
      data: {
        id: result.lastInsertRowid,
        nome,
        email,
        role: userRole
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário',
      error: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validação
    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        funcao: user.funcao,
        role: user.role || user.funcao || 'funcionario'
      },
      JWT_SECRET,
      { expiresIn: getRoleExpiry(user.role || user.funcao || 'funcionario') }
    );

    res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          funcao: user.funcao,
          role: user.role || user.funcao || 'funcionario'
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message
    });
  }
});

// Verificar token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      success: true,
      data: decoded
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
});

// Listar todos os usuários (Apenas Admin/Gerente)
router.get('/users', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Não autorizado' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== 'admin' && decoded.role !== 'gerente') {
        return res.status(403).json({ success: false, message: 'Permissão negada' });
      }

      const users = db.prepare('SELECT id, nome, email, role, funcao, ativo FROM usuarios ORDER BY nome').all();
      res.json({ success: true, data: users });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resetar senha (Apenas Admin)
router.post('/reset-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, message: 'Não autorizado' });
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Apenas administradores podem resetar senhas' });
      }

      const { userId, newPassword } = req.body;
      if (!userId || !newPassword) {
        return res.status(400).json({ success: false, message: 'Dados incompletos' });
      }

      const senhaHash = await bcrypt.hash(newPassword, 10);
      
      const result = db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(senhaHash, userId);
      
      if (result.changes === 0) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      res.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
