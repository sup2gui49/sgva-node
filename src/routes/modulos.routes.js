const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const {
  getModuleConfig,
  updateModuleConfig,
  VALID_MODES
} = require('../config/module-flags');

const formatConfig = (config) => ({
  vendasEnabled: config.vendas_enabled === 1,
  folhaEnabled: config.folha_enabled === 1,
  integracaoModo: config.integracao_modo
});

router.use(authMiddleware);

// Qualquer usuário autenticado pode consultar o estado atual
router.get('/', (req, res) => {
  try {
    const config = getModuleConfig();
    res.json({
      success: true,
      data: formatConfig(config),
      modes: VALID_MODES
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar configuração de módulos',
      error: error.message
    });
  }
});

// Apenas administradores podem alterar
router.put('/', authorize('admin'), (req, res) => {
  try {
    const payload = {
      vendasEnabled: req.body.vendasEnabled,
      folhaEnabled: req.body.folhaEnabled,
      integracaoModo: req.body.integracaoModo
    };

    const updated = updateModuleConfig(payload);
    res.json({
      success: true,
      message: 'Configuração de módulos atualizada com sucesso',
      data: formatConfig(updated),
      modes: VALID_MODES
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Falha ao atualizar configuração',
      error: error.message
    });
  }
});

module.exports = router;
