const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { requireModuleEnabled } = require('./config/module-flags');
const { getJwtSecret } = require('./config/security');

// Rotas
const authRoutes = require('./routes/auth.routes');
const produtosRoutes = require('./routes/produtos.routes');
const vendasRoutes = require('./routes/vendas.routes');
const financeiroRoutes = require('./routes/financeiro.routes');
const folhaRoutes = require('./routes/folha.routes');
const despesasRoutes = require('./routes/despesas.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');
const clientesRoutes = require('./routes/clientes.routes');
const categoriasProdutosRoutes = require('./routes/categorias-produtos.routes');
const categoriasDespesasRoutes = require('./routes/categorias-despesas.routes');
const subsidiosRoutes = require('./routes/subsidios.routes');
const folhaProfissionalRoutes = require('./routes/folha-profissional.routes');
const folhaRelatoriosRoutes = require('./routes/folha-relatorios.routes');
const backupRoutes = require('./routes/backup.routes');
const funcionariosRoutes = require('./routes/funcionarios.routes');
const empresaRoutes = require('./routes/empresa.routes');
const modulosRoutes = require('./routes/modulos.routes');
const turnosRoutes = require('./routes/turnos.routes');
const presencasRoutes = require('./routes/presencas.routes');
const saftRoutes = require('./routes/saft.routes');
const aiRoutes = require('./routes/ai.routes');
const configuracoesRoutes = require('./routes/configuracoes.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Validar segurança básica (falha rápida se JWT_SECRET estiver fraco)
getJwtSecret();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentar limite para uploads de imagens/documentos
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração correta do caminho estático
// Em produção, __dirname aponta para src/. Precisamos voltar um nível.
const publicPath = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicPath));

console.log('📂 Servindo arquivos estáticos de:', publicPath);

// Rota raiz explícita para evitar erro 404/ENOENT
app.get('/', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  const loginPath = path.join(publicPath, 'login.html');
  
  // Se existir index.html, envia ele, senão tenta login.html
  if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
  } else if (require('fs').existsSync(loginPath)) {
      res.sendFile(loginPath);
  } else {
      res.status(404).send('Arquivo index.html não encontrado no servidor.');
  }
});

// Log de requisições (desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/produtos', requireModuleEnabled('vendas'), produtosRoutes);
app.use('/api/vendas', requireModuleEnabled('vendas'), vendasRoutes);
app.use('/api/clientes', requireModuleEnabled('vendas'), clientesRoutes);
app.use('/api/financeiro', requireModuleEnabled('vendas'), financeiroRoutes);
app.use('/api/folha', requireModuleEnabled('folha'), folhaRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/relatorios', requireModuleEnabled('vendas'), relatoriosRoutes);
app.use('/api/categorias-produtos', requireModuleEnabled('vendas'), categoriasProdutosRoutes);
app.use('/api/categorias-despesas', requireModuleEnabled('vendas'), categoriasDespesasRoutes);
app.use('/api/subsidios', requireModuleEnabled('folha'), subsidiosRoutes);
app.use('/api/folha-profissional', requireModuleEnabled('folha'), folhaProfissionalRoutes);
app.use('/api/folha-relatorios', requireModuleEnabled('folha'), folhaRelatoriosRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/funcionarios', requireModuleEnabled('folha'), funcionariosRoutes);
app.use('/api/turnos', requireModuleEnabled('folha'), turnosRoutes);
app.use('/api/presencas', requireModuleEnabled('folha'), presencasRoutes);
app.use('/api/saft', saftRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/configuracoes', configuracoesRoutes);
app.use('/api/empresa', empresaRoutes);

// Rota de saúde do servidor
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'SGVA API funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Atalho para DRE (redireciona para /api/financeiro/dre)
app.get('/api/dre', (req, res) => {
  req.url = '/api/financeiro/dre' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  app._router.handle(req, res);
});

// Tratamento de erro 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.path
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀  SGVA - Sistema de Gestão de Vendas Adaptável');
  console.log('='.repeat(60));
  console.log(`📡  Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌍  Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊  API Health: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
  console.log('\n📚  Endpoints disponíveis:');
  console.log('   POST   /api/auth/register');
  console.log('   POST   /api/auth/login');
  console.log('   GET    /api/produtos');
  console.log('   POST   /api/vendas');
  console.log('   GET    /api/financeiro/dashboard');
  console.log('   GET    /api/folha/funcionarios');
  console.log('\n   Pressione Ctrl+C para parar\n');
});

module.exports = app;
