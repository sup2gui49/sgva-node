const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Diretório de backups
const BACKUP_DIR = path.join(__dirname, '../../backups');
const DEFAULT_DB_PATH = path.join(__dirname, '../../database/sgva.db');
const DB_FILE = db.filePath || db.name || DEFAULT_DB_PATH;

// Criar diretório de backups se não existir
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// ==================== BACKUP E RESTORE ====================

// Listar backups disponíveis
router.get('/list', (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files
            .filter(f => f.endsWith('.db') || f.endsWith('.sqlite'))
            .map(filename => {
                const filepath = path.join(BACKUP_DIR, filename);
                const stats = fs.statSync(filepath);
                return {
                    filename,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.modified - a.modified); // Mais recentes primeiro

        res.json({
            success: true,
            total: backups.length,
            data: backups
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao listar backups',
            error: error.message
        });
    }
});

// Criar novo backup
router.post('/create', (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFilename = `backup_${timestamp}.db`;
        const backupPath = path.join(BACKUP_DIR, backupFilename);

        if (!fs.existsSync(DB_FILE)) {
            return res.status(404).json({
                success: false,
                message: 'Banco de dados principal não encontrado'
            });
        }

        // Copiar arquivo
        fs.copyFileSync(DB_FILE, backupPath);

        // Obter informações do backup criado
        const stats = fs.statSync(backupPath);

        res.json({
            success: true,
            message: 'Backup criado com sucesso',
            data: {
                filename: backupFilename,
                size: stats.size,
                created: stats.birthtime,
                path: backupPath
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao criar backup',
            error: error.message
        });
    }
});

// Restaurar backup
router.post('/restore/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo de backup não encontrado'
            });
        }

        // Criar backup do estado atual antes de restaurar
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const preRestoreBackup = `pre_restore_${timestamp}.db`;
        
        if (fs.existsSync(DB_FILE)) {
            fs.copyFileSync(DB_FILE, path.join(BACKUP_DIR, preRestoreBackup));
        }

        // Restaurar backup
        fs.copyFileSync(backupPath, DB_FILE);

        res.json({
            success: true,
            message: 'Backup restaurado com sucesso',
            data: {
                restored: filename,
                preRestoreBackup: preRestoreBackup
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao restaurar backup',
            error: error.message
        });
    }
});

// Baixar backup
router.get('/download/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo de backup não encontrado'
            });
        }

        res.download(backupPath, filename, (err) => {
            if (err) {
                res.status(500).json({
                    success: false,
                    message: 'Erro ao baixar backup',
                    error: err.message
                });
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao processar download',
            error: error.message
        });
    }
});

// Deletar backup
router.delete('/delete/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const backupPath = path.join(BACKUP_DIR, filename);

        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({
                success: false,
                message: 'Arquivo de backup não encontrado'
            });
        }

        // Prevenir deleção acidental do banco principal
        if (filename === 'sgva.db' || filename.includes('..')) {
            return res.status(403).json({
                success: false,
                message: 'Operação não permitida'
            });
        }

        fs.unlinkSync(backupPath);

        res.json({
            success: true,
            message: 'Backup deletado com sucesso'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar backup',
            error: error.message
        });
    }
});

// Estatísticas do banco de dados
router.get('/stats', (req, res) => {
    try {
        
        if (!fs.existsSync(DB_FILE)) {
            return res.status(404).json({
                success: false,
                message: 'Banco de dados não encontrado'
            });
        }

        const stats = fs.statSync(DB_FILE);

        // Contar registros em tabelas principais
        const tables = [
            'funcionarios',
            'subsidios',
            'funcionarios_subsidios',
            'folhas_pagamento',
            'categorias_funcionarios',
            'irt_grupos'
        ];

        const counts = {};
        tables.forEach(table => {
            try {
                const result = db.prepare(`SELECT COUNT(*) as total FROM ${table}`).get();
                counts[table] = result.total;
            } catch (e) {
                counts[table] = 0;
            }
        });

        res.json({
            success: true,
            data: {
                database: {
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    path: DB_FILE
                },
                tables: counts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas',
            error: error.message
        });
    }
});

// Reset de dados para demonstração
router.post('/reset', (req, res) => {
    try {
        const { folhas, pagamentos, atribuicoes, funcionarios } = req.body;
        const deletedItems = [];

        // Transaction para garantir atomicidade
        const resetTransaction = db.transaction(() => {
            if (folhas) {
                const result = db.prepare('DELETE FROM folhas_pagamento').run();
                deletedItems.push(`${result.changes} folhas de pagamento`);
            }

            if (pagamentos) {
                const result = db.prepare('DELETE FROM folha_pagamentos_status').run();
                deletedItems.push(`${result.changes} registros de status de pagamento`);
            }

            if (atribuicoes) {
                const result = db.prepare('DELETE FROM funcionarios_subsidios').run();
                deletedItems.push(`${result.changes} atribuições de subsídios`);
            }

            if (funcionarios) {
                // Deletar funcionários (cascade vai limpar as relacionadas)
                const result = db.prepare('DELETE FROM funcionarios').run();
                deletedItems.push(`${result.changes} funcionários`);
            }
        });

        resetTransaction();

        res.json({
            success: true,
            message: `Dados resetados com sucesso!\n\nRemovidos:\n${deletedItems.join('\n')}`,
            data: {
                deleted: deletedItems
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao resetar dados',
            error: error.message
        });
    }
});

module.exports = router;
