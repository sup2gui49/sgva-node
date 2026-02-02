const db = require('./src/config/database');

try {
    // Verificar configuração atual
    const config = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
    console.log('Configuração Atual:', config);

    // Atualizar para Imposto de Selo de 1% e IRT 0%
    db.prepare(`
        UPDATE config_financeira 
        SET 
            irt_estimado_percentual = 0,
            imposto_selo_percentual = 1.0,
            imposto_selo_limite_faturacao = 0,
            atualizado_em = datetime('now', 'localtime')
        WHERE id = 1
    `).run();

    const novoConfig = db.prepare('SELECT * FROM config_financeira WHERE id = 1').get();
    console.log('Nova Configuração:', novoConfig);
    console.log('SUCESSO: Impostos configurados conforme solicitado (Apenas Selo 1%).');

} catch (err) {
    console.error('Erro:', err.message);
}
