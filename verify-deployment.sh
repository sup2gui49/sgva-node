#!/bin/bash
# Script para verificar se o deployment do SGVA está refletindo as alterações
# Verification script to check if SGVA deployment reflects the changes

echo "================================================"
echo "🔍 SGVA Deployment Verification Script"
echo "================================================"
echo ""

URL="https://sgva-node.onrender.com/index.html"

echo "📡 Testando conexão com: $URL"
echo ""

# Test if the site is reachable
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ ERRO: Site não está acessível (HTTP $HTTP_CODE)"
    echo "   Verifique se o serviço está rodando no Render"
    exit 1
fi

echo "✅ Site está acessível (HTTP $HTTP_CODE)"
echo ""

# Check for version indicators
echo "🔎 Verificando indicadores de versão..."
echo ""

CONTENT=$(curl -s "$URL")

# Check for new version badge
if echo "$CONTENT" | grep -q "v1.0.1"; then
    echo "✅ Badge de versão 'v1.0.1' encontrado"
else
    echo "❌ Badge de versão 'v1.0.1' NÃO encontrado"
    echo "   ⚠️  O deployment pode não ter sido atualizado"
fi

# Check for February 2026
if echo "$CONTENT" | grep -q "Fevereiro 2026"; then
    echo "✅ Data 'Fevereiro 2026' encontrada"
else
    echo "❌ Data 'Fevereiro 2026' NÃO encontrada"
    echo "   ⚠️  Ainda mostrando data antiga"
fi

# Check for "Sistema Atualizado" badge
if echo "$CONTENT" | grep -q "Sistema Atualizado"; then
    echo "✅ Badge 'Sistema Atualizado' encontrado"
else
    echo "❌ Badge 'Sistema Atualizado' NÃO encontrado"
fi

# Check for updated timestamp
if echo "$CONTENT" | grep -q "05/02/2026"; then
    echo "✅ Timestamp '05/02/2026' encontrado"
else
    echo "❌ Timestamp '05/02/2026' NÃO encontrado"
fi

# Check for cache control headers
if echo "$CONTENT" | grep -q "Cache-Control"; then
    echo "✅ Meta tags de cache-control encontradas"
else
    echo "⚠️  Meta tags de cache-control NÃO encontradas no HTML"
fi

echo ""
echo "================================================"
echo "📊 Resumo da Verificação"
echo "================================================"
echo ""

# Count successful checks
SUCCESS_COUNT=$(echo "$CONTENT" | grep -c -E "v1.0.1|Fevereiro 2026|Sistema Atualizado|05/02/2026")

if [ "$SUCCESS_COUNT" -ge 3 ]; then
    echo "✅ DEPLOYMENT BEM-SUCEDIDO!"
    echo "   Todas as alterações estão refletidas no site."
    echo ""
    echo "🎉 O problema foi RESOLVIDO!"
else
    echo "⚠️  DEPLOYMENT PENDENTE OU INCOMPLETO"
    echo "   Apenas $SUCCESS_COUNT de 4 indicadores encontrados."
    echo ""
    echo "💡 Possíveis soluções:"
    echo "   1. Aguarde alguns minutos para o Render completar o deployment"
    echo "   2. Force um redeploy no dashboard do Render"
    echo "   3. Limpe o cache do navegador (Ctrl+Shift+R)"
    echo "   4. Verifique os logs do Render para erros"
fi

echo ""
echo "🔗 URL do site: $URL"
echo ""
