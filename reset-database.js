/**
 * SCRIPT DE RESET DO BANCO DE DADOS
 * 
 * Este script limpa todos os dados do sistema, mantendo apenas:
 * - Subsídios
 * - Categorias de produtos (com IVA configurado)
 * - Categorias salariais
 * - Escalões de IRT
 * - Configurações financeiras
 * 
 * ATENÇÃO: Esta operação é IRREVERSÍVEL!
 */

const sqlite3 = require('better-sqlite3');
const readline = require('readline');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'sgva.db');

// Interface para confirmação
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function confirmar(pergunta) {
    return new Promise((resolve) => {
        rl.question(pergunta, (resposta) => {
            resolve(resposta.toLowerCase() === 's' || resposta.toLowerCase() === 'sim');
        });
    });
}

async function resetDatabase() {
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  RESET DO BANCO DE DADOS - SGVA');
    console.log('='.repeat(70));
    console.log('\nEste script irá APAGAR os seguintes dados:');
    console.log('  ❌ Usuários');
    console.log('  ❌ Funcionários');
    console.log('  ❌ Folhas de pagamento');
    console.log('  ❌ Produtos');
    console.log('  ❌ Vendas');
    console.log('  ❌ Despesas');
    console.log('  ❌ Histórico de atribuições');
    console.log('  ❌ Folhas mensais');
    
    console.log('\nSerão MANTIDOS:');
    console.log('  ✅ Subsídios');
    console.log('  ✅ Categorias de produtos (com configuração de IVA)');
    console.log('  ✅ Categorias salariais');
    console.log('  ✅ Escalões de IRT (12 escalões - Sistema 2025)');
    console.log('  ✅ Configurações financeiras');
    console.log('  ✅ Dados da empresa');
    
    console.log('\n' + '='.repeat(70));
    
    // Verificar se foi passado argumento --confirm para pular confirmações
    const autoConfirm = process.argv.includes('--confirm');
    
    if (!autoConfirm) {
        const confirma1 = await confirmar('\n⚠️  Tem certeza que deseja continuar? (s/n): ');
        if (!confirma1) {
            console.log('\n❌ Operação cancelada pelo usuário.\n');
            rl.close();
            return;
        }
        
        const confirma2 = await confirmar('\n⚠️  ÚLTIMA CHANCE! Esta ação é IRREVERSÍVEL. Confirmar? (s/n): ');
        if (!confirma2) {
            console.log('\n❌ Operação cancelada pelo usuário.\n');
            rl.close();
            return;
        }
    } else {
        console.log('\n✅ Modo automático ativado (--confirm). Pulando confirmações...');
    }
    
    console.log('\n🔄 Iniciando reset do banco de dados...\n');
    
    try {
        const db = sqlite3(dbPath);
        
        // Desabilitar foreign keys temporariamente
        db.pragma('foreign_keys = OFF');
        
        // Iniciar transação
        const reset = db.transaction(() => {
            let totalRegistros = 0;
            
            // 1. LIMPAR USUÁRIOS
            console.log('🗑️  Limpando usuários...');
            const delUsers = db.prepare('DELETE FROM usuarios').run();
            console.log(`   ✅ ${delUsers.changes} usuário(s) removido(s)`);
            totalRegistros += delUsers.changes;
            
            // 2. LIMPAR FUNCIONÁRIOS
            console.log('🗑️  Limpando funcionários...');
            const delFunc = db.prepare('DELETE FROM funcionarios').run();
            console.log(`   ✅ ${delFunc.changes} funcionário(s) removido(s)`);
            totalRegistros += delFunc.changes;
            
            // 3. LIMPAR FOLHAS DE PAGAMENTO
            console.log('🗑️  Limpando folhas de pagamento...');
            try {
                const delFolhas = db.prepare('DELETE FROM folhas_pagamento').run();
                console.log(`   ✅ ${delFolhas.changes} registro(s) de folha removido(s)`);
                totalRegistros += delFolhas.changes;
            } catch (e) {
                console.log(`   ⚠️  Tabela folhas_pagamento: ${e.message}`);
            }
            
            // 4. LIMPAR FOLHAS MENSAIS
            console.log('🗑️  Limpando folhas mensais...');
            try {
                const delFolhasMensais = db.prepare('DELETE FROM folhas_mensais').run();
                console.log(`   ✅ ${delFolhasMensais.changes} folha(s) mensal(is) removida(s)`);
                totalRegistros += delFolhasMensais.changes;
            } catch (e) {
                console.log(`   ⚠️  Tabela folhas_mensais: ${e.message}`);
            }
            
            // 5. LIMPAR ATRIBUIÇÕES DE SUBSÍDIOS
            console.log('🗑️  Limpando atribuições de subsídios...');
            try {
                const delFuncSubsidios = db.prepare('DELETE FROM funcionarios_subsidios').run();
                console.log(`   ✅ ${delFuncSubsidios.changes} atribuição(ões) removida(s) (funcionarios_subsidios)`);
                totalRegistros += delFuncSubsidios.changes;
            } catch (e) {
                console.log(`   ⚠️  Tabela funcionarios_subsidios: ${e.message}`);
            }
            
            try {
                const delFuncSubsidios2 = db.prepare('DELETE FROM funcionario_subsidios').run();
                console.log(`   ✅ ${delFuncSubsidios2.changes} atribuição(ões) removida(s) (funcionario_subsidios)`);
                totalRegistros += delFuncSubsidios2.changes;
            } catch (e) {
                console.log(`   ⚠️  Tabela funcionario_subsidios: ${e.message}`);
            }
            
            // 5b. LIMPAR DETALHES DE SUBSÍDIOS NA FOLHA
            try {
                const delFolhaSubsidios = db.prepare('DELETE FROM folha_subsidios_detalhes').run();
                console.log(`   ✅ ${delFolhaSubsidios.changes} detalhe(s) de subsídio removido(s)`);
                totalRegistros += delFolhaSubsidios.changes;
            } catch (e) {
                console.log(`   ⚠️  Tabela folha_subsidios_detalhes: ${e.message}`);
            }
            
            // 5c. LIMPAR ITENS DE FOLHA
            try {
                const delItens = db.prepare('DELETE FROM itens_folha').run();
                console.log(`   ✅ ${delItens.changes} item(ns) de folha removido(s)`);
                totalRegistros += delItens.changes;
            } catch (e) {
                console.log(`   ⚠️  Tabela itens_folha: ${e.message}`);
            }
            
            // 6. LIMPAR PRODUTOS
            console.log('🗑️  Limpando produtos...');
            const delProdutos = db.prepare('DELETE FROM produtos').run();
            console.log(`   ✅ ${delProdutos.changes} produto(s) removido(s)`);
            totalRegistros += delProdutos.changes;
            
            // 7. LIMPAR VENDAS
            console.log('🗑️  Limpando vendas...');
            const delVendas = db.prepare('DELETE FROM vendas').run();
            console.log(`   ✅ ${delVendas.changes} venda(s) removida(s)`);
            totalRegistros += delVendas.changes;
            
            // 8. LIMPAR DESPESAS
            console.log('🗑️  Limpando despesas...');
            const delDespesas = db.prepare('DELETE FROM despesas').run();
            console.log(`   ✅ ${delDespesas.changes} despesa(s) removida(s)`);
            totalRegistros += delDespesas.changes;
            
            // 9. RESETAR AUTOINCREMENT
            console.log('🔄 Resetando contadores de ID...');
            db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .run('usuarios', 'funcionarios', 'folhas_pagamento', 'folhas_mensais', 
                   'funcionarios_subsidios', 'itens_folha', 'produtos', 'vendas', 'despesas', 
                   'folha_subsidios_detalhes');
            console.log('   ✅ Contadores resetados');
            
            // 10. VERIFICAR DADOS MANTIDOS
            console.log('\n📊 Verificando dados mantidos...');
            
            const subsidios = db.prepare('SELECT COUNT(*) as count FROM subsidios').get();
            console.log(`   ✅ Subsídios: ${subsidios.count} registro(s)`);
            
            const categoriasProdutos = db.prepare('SELECT COUNT(*) as count FROM categorias_produtos').get();
            console.log(`   ✅ Categorias de produtos: ${categoriasProdutos.count} registro(s)`);
            
            try {
                const categoriasFuncionarios = db.prepare('SELECT COUNT(*) as count FROM categorias_funcionarios').get();
                console.log(`   ✅ Categorias de funcionários: ${categoriasFuncionarios.count} registro(s)`);
            } catch (e) {
                console.log(`   ⚠️  Tabela categorias_funcionarios não encontrada`);
            }
            
            const escaloesIRT = db.prepare('SELECT COUNT(*) as count FROM escaloes_irt').get();
            console.log(`   ✅ Escalões IRT: ${escaloesIRT.count} registro(s) - Sistema 2025`);
            
            const config = db.prepare('SELECT COUNT(*) as count FROM config_financeira').get();
            console.log(`   ✅ Configurações financeiras: ${config.count} registro(s)`);
            
            try {
                const empresa = db.prepare('SELECT COUNT(*) as count FROM empresa').get();
                console.log(`   ✅ Dados da empresa: ${empresa.count} registro(s)`);
            } catch (e) {
                console.log(`   ⚠️  Tabela empresa não encontrada`);
            }
            
            return totalRegistros;
        });
        
        // Executar transação
        const totalRemovidos = reset();
        
        // Reabilitar foreign keys
        db.pragma('foreign_keys = ON');
        
        // Otimizar banco de dados
        console.log('\n🔧 Otimizando banco de dados...');
        db.pragma('vacuum');
        db.pragma('optimize');
        console.log('   ✅ Banco otimizado');
        
        db.close();
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ RESET CONCLUÍDO COM SUCESSO!');
        console.log('='.repeat(70));
        console.log(`\n📊 Total de ${totalRemovidos} registro(s) removido(s)`);
        console.log('\n💡 Próximos passos:');
        console.log('   1. Reinicie o servidor: node src/server.js');
        console.log('   2. Crie um novo usuário admin no sistema');
        console.log('   3. Cadastre funcionários em: http://localhost:3000/folha-funcionarios.html');
        console.log('   4. Cadastre produtos em: http://localhost:3000/gestao-produtos.html');
        console.log('   5. Configure o sistema em: http://localhost:3000/configuracoes.html');
        console.log('\n');
        
    } catch (error) {
        console.error('\n❌ ERRO ao resetar banco de dados:', error.message);
        console.error('\nDetalhes:', error);
        console.log('\n⚠️  O banco de dados pode estar em estado inconsistente.');
        console.log('💡 Restaure um backup se disponível.\n');
    }
    
    rl.close();
}

// Executar
resetDatabase().catch(error => {
    console.error('Erro fatal:', error);
    rl.close();
    process.exit(1);
});
