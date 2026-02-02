const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicialmente, tentará usar a chave do arquivo .env
// Se não existir, o serviço lidará com o erro de forma graciosa
const API_KEY = process.env.GEMINI_API_KEY || '';

let genAI = null;
let model = null;

function initAI() {
    if (!API_KEY) {
        console.warn('⚠️ AVISO: GEMINI_API_KEY não definida no arquivo .env. O chat IA não funcionará.');
        return false;
    }
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-pro"});
        return true;
    } catch (error) {
        console.error('Erro ao inicializar Gemini:', error);
        return false;
    }
}

// Inicializar
initAI();

/**
 * Envia uma mensagem para o Gemini e retorna a resposta
 * @param {string} mensagem - A pergunta do usuário
 * @param {string} contextoUsuario - (Opcional) Informações sobre quem está perguntando (Nome, Cargo)
 */
async function perguntarAoGemini(mensagem, contextoUsuario = '') {
    if (!model) {
        if (!initAI()) {
            throw new Error('Chave de API do Gemini não configurada. Contacte o administrador.');
        }
    }

    try {
        // Instrução de Sistema (Contexto do SGVA)
        const systemInstruction = `
Você é o assistente virtual inteligente do "SGVA" (Sistema de Gestão de Vendas Adaptável).
Seu objetivo é ajudar os funcionários com dúvidas sobre o sistema, gestão financeira, RH ou cálculos simples.

Contexto do Usuário Atual: ${contextoUsuario}

Diretrizes:
1. Responda em Português de Angola/Portugal de forma profissional e cortês.
2. Seja conciso. Evite respostas muito longas a menos que solicitado.
3. Se a pergunta for sobre "como fazer algo no sistema", explique passos gerais baseados em sistemas de gestão (ex: "Vá ao menu X").
4. Se o usuário pedir para calcular salários ou impostos, lembre que você faz uma estimativa, mas o cálculo oficial é o do sistema.
5. Se não souber a resposta, sugira que contactem o administrador do sistema.

Pergunta do usuário:
${mensagem}
        `;

        const result = await model.generateContent(systemInstruction);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Erro na requisição ao Gemini:', error);
        throw new Error('Ocorreu um erro ao comunicar com a inteligência artificial.');
    }
}

module.exports = {
    perguntarAoGemini
};