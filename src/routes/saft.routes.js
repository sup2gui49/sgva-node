const express = require('express');
const router = express.Router();
const SaftController = require('../controllers/saft.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

router.use(authMiddleware);

// Exportar SAF-T AO (Apenas Admin/Gerente)
router.get('/export', authorize('admin', 'gerente'), SaftController.exportSaft);

module.exports = router;
