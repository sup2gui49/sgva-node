const PDFDocument = require('pdfkit');

class PDFService {
  // Método auxiliar para adicionar cabeçalho
  addHeader(doc, titulo, subtitulo) {
    // Fundo azul gradient no cabeçalho
    doc.rect(0, 0, doc.page.width, 110).fill('#667eea');
    doc.rect(0, 0, doc.page.width, 110).fillOpacity(0.1).fill('#764ba2');
    
    // Restaurar opacidade
    doc.fillOpacity(1);
    
    // Nome do sistema
    doc.fontSize(22)
       .fillColor('#ffffff')
       .font('Helvetica-Bold')
       .text('SGVA', 50, 25, { continued: true })
       .font('Helvetica')
       .fontSize(14)
       .text(' Sistema de Gestão de Vendas Adaptável', { align: 'left' });
    
    // Título do relatório
    doc.fontSize(18)
       .fillColor('#ffffff')
       .font('Helvetica-Bold')
       .text(titulo, 50, 55);
    
    // Subtítulo
    doc.fontSize(11)
       .fillColor('#e8e8e8')
       .font('Helvetica')
       .text(subtitulo, 50, 80);
    
    // Linha decorativa
    doc.moveTo(50, 105).lineTo(doc.page.width - 50, 105).lineWidth(2).strokeColor('#ffffff').stroke();
    
    // Resetar para conteúdo
    doc.fillColor('#2c3e50');
  }

  // Método auxiliar para adicionar rodapé
  addFooter(doc, pageNumber) {
    const pageHeight = doc.page.height;
    const y = pageHeight - 50;
    
    // Linha superior do rodapé
    doc.moveTo(50, y - 10)
       .lineTo(doc.page.width - 50, y - 10)
       .lineWidth(1)
       .strokeColor('#667eea')
       .stroke();
    
    // Informações do rodapé
    doc.fontSize(8)
       .fillColor('#7f8c8d')
       .font('Helvetica');
    
    // Esquerda: SGVA
    doc.text('SGVA © 2025', 50, y, { width: 150, align: 'left', lineBreak: false });
    
    // Centro: Data/Hora
    doc.text(
      `Emitido em ${new Date().toLocaleString('pt-AO')}`,
      200,
      y,
      { width: 200, align: 'center', lineBreak: false }
    );
    
    // Direita: Página
    doc.text(
      `Página ${pageNumber}`,
      doc.page.width - 200,
      y,
      { width: 150, align: 'right', lineBreak: false }
    );
  }

  // RELATÓRIO DE VENDAS
  gerarRelatorioVendas(vendas, periodo, res) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        this.addHeader(doc, 'Relatório de Vendas', `Período: ${periodo.mes}/${periodo.ano}`);

        const totalVendas = vendas.length;
        const valorTotal = vendas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);

        doc.fontSize(12).fillColor('#2c3e50');
        doc.text(`Total de Vendas: ${totalVendas}`, 50, 130);
        doc.text(`Valor Total: ${valorTotal.toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2})} KZ`, 50, 150);

        let y = 190;
        doc.fontSize(10).fillColor('#667eea').font('Helvetica-Bold');
        doc.text('Data', 50, y, { width: 60 })
           .text('Cliente', 115, y, { width: 100 })
           .text('Produtos', 220, y, { width: 120 })
           .text('Total', 345, y, { width: 70, align: 'right' })
           .text('Pgto', 420, y, { width: 60 })
           .text('Status', 485, y, { width: 65 });

        y += 20;
        doc.moveTo(50, y).lineTo(550, y).stroke('#667eea');

        doc.fontSize(8).fillColor('#333333').font('Helvetica');
        let pageNumber = 1;
        
        vendas.forEach((venda, index) => {
          y += 18;
          
          // Nova página se necessário
          if (y > 720) {
            this.addFooter(doc, pageNumber);
            doc.addPage();
            this.addHeader(doc, 'Relatório de Vendas (cont.)', `Período: ${periodo.mes}/${periodo.ano}`);
            pageNumber++;
            y = 180;
            
            // Redesenhar cabeçalho da tabela
            doc.fontSize(10).fillColor('#667eea').font('Helvetica-Bold');
            doc.text('Data', 50, y, { width: 60 })
               .text('Cliente', 115, y, { width: 100 })
               .text('Produtos', 220, y, { width: 120 })
               .text('Total', 345, y, { width: 70, align: 'right' })
               .text('Pgto', 420, y, { width: 60 })
               .text('Status', 485, y, { width: 65 });
            y += 20;
            doc.moveTo(50, y).lineTo(550, y).stroke('#667eea');
            doc.fontSize(8).fillColor('#333333').font('Helvetica');
            y += 18;
          }

          // Fundo alternado para melhor leitura
          if (index % 2 === 0) {
            doc.rect(45, y - 5, 510, 18).fillOpacity(0.05).fill('#667eea');
            doc.fillOpacity(1);
          }

          const data = new Date(venda.data_venda).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
          const cliente = (venda.cliente_nome || 'Sem cadastro').substring(0, 18);
          const produtos = venda.itens ? venda.itens.map(i => i.descricao).join(', ').substring(0, 25) : 'N/A';
          const total = parseFloat(venda.total || 0).toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2});

          doc.fillColor('#333333')
             .text(data, 50, y, { width: 60 })
             .text(cliente, 115, y, { width: 100 })
             .text(produtos, 220, y, { width: 120 })
             .fillColor('#27ae60')
             .text(total, 345, y, { width: 70, align: 'right' })
             .fillColor('#333333')
             .text(venda.tipo_pagamento, 420, y, { width: 60 })
             .text(venda.status, 485, y, { width: 65 });
        });

        this.addFooter(doc, pageNumber);
        doc.end();
        
        doc.on('end', resolve);
        doc.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // RELATÓRIO DRE
  gerarRelatorioDRE(dre, periodo, res) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        this.addHeader(doc, 'Demonstrativo de Resultado (DRE)', `Período: ${periodo.mes}/${periodo.ano}`);

        let y = 140;
        doc.fontSize(11).fillColor('#2c3e50').font('Helvetica-Bold');
        
        const items = [
          { label: 'Receita Bruta', value: dre.receita_bruta, bold: true },
          { label: '(-) Deduções', value: dre.deducoes },
          { label: 'Receita Líquida', value: dre.receita_liquida, bold: true },
          { label: '(-) CMV', value: dre.cmv },
          { label: 'Lucro Bruto', value: dre.lucro_bruto, bold: true, color: '#27ae60' },
          { label: '(-) Despesas Operacionais', value: dre.despesas_operacionais.total },
          { label: 'Lucro Operacional', value: dre.lucro_operacional, bold: true },
          { label: '(-) Folha de Pagamento', value: dre.folha_pagamento },
          { label: '(-) INSS Patronal', value: dre.inss_patronal },
          { label: 'Lucro Líquido', value: dre.lucro_liquido, bold: true, color: dre.lucro_liquido >= 0 ? '#27ae60' : '#e74c3c', size: 14 }
        ];

        items.forEach(item => {
          const font = item.bold ? 'Helvetica-Bold' : 'Helvetica';
          const size = item.size || 11;
          const color = item.color || '#2c3e50';
          
          doc.font(font).fontSize(size).fillColor(color);
          doc.text(item.label, 50, y, { width: 300 });
          doc.text(`${parseFloat(item.value || 0).toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2})} KZ`, 350, y, { width: 200, align: 'right' });
          
          y += size === 14 ? 30 : 25;
          
          if (item.bold) {
            doc.moveTo(50, y - 10).lineTo(550, y - 10).stroke('#ecf0f1');
          }
        });

        this.addFooter(doc, 1);
        doc.end();
        
        doc.on('end', resolve);
        doc.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // RELATÓRIO DE DESPESAS
  gerarRelatorioDespesas(despesas, periodo, res) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        this.addHeader(doc, 'Relatório de Despesas', `Período: ${periodo.mes}/${periodo.ano}`);

        const totalDespesas = despesas.length;
        const valorTotal = despesas.reduce((sum, d) => sum + parseFloat(d.valor || 0), 0);
        const valorPago = despesas.filter(d => d.pago).reduce((sum, d) => sum + parseFloat(d.valor || 0), 0);

        doc.fontSize(12).fillColor('#2c3e50');
        doc.text(`Total de Despesas: ${totalDespesas}`, 50, 130);
        doc.text(`Valor Total: ${valorTotal.toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2})} KZ`, 50, 150);
        doc.text(`Valor Pago: ${valorPago.toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2})} KZ`, 50, 170);

        let y = 210;
        doc.fontSize(10).fillColor('#667eea').font('Helvetica-Bold');
        doc.text('Data', 50, y, { width: 60 })
           .text('Categoria', 115, y, { width: 80 })
           .text('Descrição', 200, y, { width: 180 })
           .text('Valor', 385, y, { width: 90, align: 'right' })
           .text('Status', 480, y, { width: 70 });

        y += 20;
        doc.moveTo(50, y).lineTo(550, y).stroke('#667eea');

        doc.fontSize(9).fillColor('#333333').font('Helvetica');
        despesas.forEach((despesa, index) => {
          y += 20;
          if (y > 700) {
            this.addFooter(doc, 1);
            doc.addPage();
            this.addHeader(doc, 'Relatório de Despesas (cont.)', `Período: ${periodo.mes}/${periodo.ano}`);
            y = 180;
          }

          // Fundo alternado
          if (index % 2 === 0) {
            doc.rect(45, y - 5, 510, 20).fillOpacity(0.05).fill('#667eea');
            doc.fillOpacity(1);
          }

          const data = new Date(despesa.data).toLocaleDateString('pt-AO');
          const valor = parseFloat(despesa.valor || 0).toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          const status = despesa.pago ? 'Pago' : 'Pendente';
          const statusColor = despesa.pago ? '#27ae60' : '#e74c3c';

          doc.fillColor('#333333')
             .text(data, 50, y, { width: 60 })
             .text(despesa.categoria, 115, y, { width: 80 })
             .text(despesa.descricao, 200, y, { width: 180 })
             .fillColor('#e74c3c')
             .text(valor + ' KZ', 385, y, { width: 90, align: 'right' })
             .fillColor(statusColor)
             .text(status, 480, y, { width: 70 });
        });

        this.addFooter(doc, 1);
        doc.end();
        
        doc.on('end', resolve);
        doc.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // RELATÓRIO DE FOLHA
  gerarRelatorioFolha(funcionarios, periodo, res) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        this.addHeader(doc, 'Folha de Pagamento', `Período: ${periodo.mes}/${periodo.ano}`);

        const totalFuncionarios = funcionarios.length;
        const totalSalarios = funcionarios.reduce((sum, f) => sum + parseFloat(f.salario_base || 0), 0);

        doc.fontSize(12).fillColor('#2c3e50');
        doc.text(`Total de Funcionários: ${totalFuncionarios}`, 50, 130);
        doc.text(`Total de Salários: ${totalSalarios.toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2})} KZ`, 50, 150);

        let y = 190;
        doc.fontSize(10).fillColor('#667eea').font('Helvetica-Bold');
        doc.text('Nome', 50, y, { width: 180 })
           .text('Categoria', 235, y, { width: 110 })
           .text('Salário Base', 350, y, { width: 100, align: 'right' })
           .text('Status', 460, y, { width: 90 });

        y += 20;
        doc.moveTo(50, y).lineTo(550, y).stroke('#667eea');

        doc.fontSize(9).fillColor('#333333').font('Helvetica');
        let pageNumber = 1;
        
        funcionarios.forEach((func, index) => {
          y += 20;
          
          // Nova página se necessário
          if (y > 720) {
            this.addFooter(doc, pageNumber);
            doc.addPage();
            this.addHeader(doc, 'Folha de Pagamento (cont.)', `Período: ${periodo.mes}/${periodo.ano}`);
            pageNumber++;
            y = 180;
            
            // Redesenhar cabeçalho da tabela
            doc.fontSize(10).fillColor('#667eea').font('Helvetica-Bold');
            doc.text('Nome', 50, y, { width: 180 })
               .text('Categoria', 235, y, { width: 110 })
               .text('Salário Base', 350, y, { width: 100, align: 'right' })
               .text('Status', 460, y, { width: 90 });
            y += 20;
            doc.moveTo(50, y).lineTo(550, y).stroke('#667eea');
            doc.fontSize(9).fillColor('#333333').font('Helvetica');
            y += 20;
          }

          // Fundo alternado
          if (index % 2 === 0) {
            doc.rect(45, y - 5, 510, 20).fillOpacity(0.05).fill('#667eea');
            doc.fillOpacity(1);
          }

          const salario = parseFloat(func.salario_base || 0).toLocaleString('pt-AO', {minimumFractionDigits: 2, maximumFractionDigits: 2});
          const status = func.ativo ? 'Ativo' : 'Inativo';
          const statusColor = func.ativo ? '#27ae60' : '#e74c3c';

          doc.fillColor('#333333')
             .text(func.nome, 50, y, { width: 180 })
             .text(func.categoria, 235, y, { width: 110 })
             .fillColor('#3498db')
             .text(salario + ' KZ', 350, y, { width: 100, align: 'right' })
             .fillColor(statusColor)
             .text(status, 460, y, { width: 90 });
        });

        this.addFooter(doc, pageNumber);
        doc.end();
        
        doc.on('end', resolve);
        doc.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // RECIBO DE COMPRA
  gerarReciboCompra(venda, itens, res) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);

        // Cabeçalho especial para recibo
        doc.rect(0, 0, doc.page.width, 140).fill('#667eea');
        
        doc.fillOpacity(1);
        doc.fontSize(28)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text('RECIBO DE COMPRA', 0, 40, { align: 'center' });
        
        doc.fontSize(11)
           .fillColor('#e8e8e8')
           .font('Helvetica')
           .text('SGVA - Sistema de Gestão de Vendas Adapt\u00e1vel', 0, 80, { align: 'center' });
        
        doc.fontSize(10)
           .text('NIF: 5000123456 | Tel: +244 923 456 789', 0, 100, { align: 'center' });
        
        // Número do recibo
        doc.fontSize(14)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text(`Nº ${String(venda.id).padStart(6, '0')}`, 0, 120, { align: 'center' });
        
        // Resetar cor
        doc.fillColor('#2c3e50');
        
        // Informações do cliente e data
        let y = 180;
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('DADOS DO CLIENTE', 50, y);
        
        y += 25;
        doc.fontSize(10).font('Helvetica');
        doc.text(`Cliente: ${venda.cliente_nome || 'Cliente Final'}`, 50, y);
        doc.text(`Data: ${new Date(venda.data_venda).toLocaleString('pt-AO')}`, 350, y);
        
        y += 20;
        doc.text(`Vendedor: ${venda.vendedor_nome || 'Sistema'}`, 50, y);
        doc.text(`Pagamento: ${venda.tipo_pagamento}`, 350, y);
        
        // Linha separadora
        y += 30;
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).lineWidth(2).strokeColor('#667eea').stroke();
        
        // Tabela de produtos
        y += 20;
        doc.fontSize(11).fillColor('#667eea').font('Helvetica-Bold');
        doc.text('Produto', 50, y, { width: 220 })
           .text('Qtd', 270, y, { width: 50, align: 'center' })
           .text('Preço Unit.', 320, y, { width: 100, align: 'right' })
           .text('Subtotal', 420, y, { width: 130, align: 'right' });
        
        y += 20;
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).stroke('#667eea');
        
        // Itens da venda
        y += 10;
        doc.fontSize(10).fillColor('#333333').font('Helvetica');
        
        let subtotalGeral = 0;
        itens.forEach((item, index) => {
          y += 20;
          
          // Fundo alternado
          if (index % 2 === 0) {
            doc.rect(45, y - 5, doc.page.width - 90, 20).fillOpacity(0.03).fill('#667eea');
            doc.fillOpacity(1);
          }
          
          const preco = parseFloat(item.preco_unitario || 0);
          const subtotal = preco * item.quantidade;
          subtotalGeral += subtotal;
          
          doc.fillColor('#333333')
             .text(item.descricao, 50, y, { width: 220 })
             .text(String(item.quantidade), 270, y, { width: 50, align: 'center' })
             .text(preco.toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 320, y, { width: 100, align: 'right' })
             .text(subtotal.toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 420, y, { width: 130, align: 'right' });
        });
        
        // Totais
        y += 40;
        doc.moveTo(350, y).lineTo(doc.page.width - 50, y).stroke('#667eea');
        
        y += 15;
        doc.fontSize(11).font('Helvetica').fillColor('#333333');
        doc.text('Subtotal:', 350, y, { width: 70 });
        doc.text(subtotalGeral.toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 420, y, { width: 130, align: 'right' });
        
        y += 20;
        const desconto = parseFloat(venda.desconto || 0);
        if (desconto > 0) {
          doc.fillColor('#e74c3c');
          doc.text('Desconto:', 350, y, { width: 70 });
          doc.text('- ' + desconto.toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 420, y, { width: 130, align: 'right' });
          y += 20;
        }
        
        // Subtotal após desconto
        const subtotalComDesconto = subtotalGeral - desconto;
        doc.fillColor('#333333').fontSize(11).font('Helvetica');
        doc.text('Subtotal:', 350, y, { width: 70 });
        doc.text(subtotalComDesconto.toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 420, y, { width: 130, align: 'right' });
        
        // IVA
        y += 20;
        const taxaIva = parseFloat(venda.taxa_iva || 0);
        const valorIva = parseFloat(venda.valor_iva || 0);
        doc.fillColor('#3498db');
        doc.text(`IVA (${taxaIva}%):`, 350, y, { width: 70 });
        doc.text(valorIva.toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 420, y, { width: 130, align: 'right' });
        
        // Total com IVA
        y += 25;
        doc.fillColor('#27ae60').fontSize(14).font('Helvetica-Bold');
        doc.text('TOTAL:', 350, y, { width: 70 });
        doc.text(parseFloat(venda.total).toLocaleString('pt-AO', {minimumFractionDigits: 2}) + ' KZ', 420, y, { width: 130, align: 'right' });
        
        // Linha final
        y += 30;
        doc.moveTo(50, y).lineTo(doc.page.width - 50, y).lineWidth(2).strokeColor('#667eea').stroke();
        
        // Mensagem de agradecimento
        y += 30;
        doc.fillColor('#7f8c8d').fontSize(10).font('Helvetica-Oblique');
        doc.text('Obrigado pela sua preferência!', 0, y, { align: 'center' });
        doc.text('Volte sempre!', 0, y + 15, { align: 'center' });
        
        // Rodapé especial para recibo
        const footerY = doc.page.height - 60;
        doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).lineWidth(1).strokeColor('#ecf0f1').stroke();
        doc.fontSize(8).fillColor('#95a5a6').font('Helvetica');
        doc.text('Este documento é válido como comprovante de compra', 0, footerY + 10, { align: 'center', lineBreak: false });
        doc.text('SGVA © 2025 - Emitido eletronicamente', 0, footerY + 25, { align: 'center', lineBreak: false });
        
        doc.end();
        
        doc.on('end', resolve);
        doc.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();
