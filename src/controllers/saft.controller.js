const db = require('../config/database');
const { create } = require('xmlbuilder2');

class SaftController {
    static async exportSaft(req, res) {
        try {
            const { year, month } = req.query;
            const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month, 0).toISOString().split('T')[0];

            // 1. Dados da Empresa
            const empresa = db.prepare('SELECT * FROM empresa WHERE id = 1').get();
            
            // 2. Dados Mestre (Clientes, Produtos)
            const clientes = db.prepare('SELECT * FROM clientes').all();
            const produtos = db.prepare('SELECT * FROM produtos').all();

            // 3. Documentos Comerciais (Vendas)
            // Filtro por data
            const vendas = db.prepare(`
                SELECT v.*, c.nif as cliente_nif, c.nome as cliente_nome 
                FROM vendas v 
                LEFT JOIN clientes c ON v.cliente_id = c.id
                WHERE date(v.data_venda) BETWEEN ? AND ?
                AND v.status = 'concluido'
            `).all(startDate, endDate);

            // Itens das vendas
            const vendaIds = vendas.map(v => v.id);
            let itens = [];
            if (vendaIds.length > 0) {
                const placeholders = vendaIds.map(() => '?').join(',');
                itens = db.prepare(`SELECT * FROM itens_venda WHERE venda_id IN (${placeholders})`).all(...vendaIds);
            }

            // --- BUILD XML ---
            const doc = create({ version: '1.0', encoding: 'UTF-8' })
                .ele('AuditFile', { xmlns: 'urn:OECD:StandardAuditFile-Tax:AO_1.01_01' })
                    .ele('Header')
                        .ele('AuditFileVersion').txt('1.01_01').up()
                        .ele('CompanyID').txt(empresa.nif || '999999999').up()
                        .ele('TaxRegistrationNumber').txt(empresa.nif || '999999999').up()
                        .ele('TaxAccountingBasis').txt('F').up() // Faturação
                        .ele('CompanyName').txt(empresa.nome).up()
                        .ele('BusinessName').txt(empresa.nome).up()
                        .ele('CompanyAddress')
                            .ele('AddressDetail').txt(empresa.endereco).up()
                            .ele('City').txt(empresa.cidade).up()
                            .ele('Country').txt('AO').up()
                        .up()
                        .ele('FiscalYear').txt(year).up()
                        .ele('StartDate').txt(startDate).up()
                        .ele('EndDate').txt(endDate).up()
                        .ele('CurrencyCode').txt('AOA').up()
                        .ele('DateCreated').txt(new Date().toISOString().split('T')[0]).up()
                        .ele('TaxEntity').txt('Global').up()
                        .ele('ProductCompanyTaxID').txt(empresa.nif || '999999999').up()
                        .ele('SoftwareValidationNumber').txt('000/AGT/2024').up() // Placeholder
                        .ele('ProductID').txt('SGVA/Node').up()
                        .ele('ProductVersion').txt('1.0.0').up()
                    .up() // End Header

                    .ele('MasterFiles')
                        .ele('Customer')
                            .ele('CustomerID').txt('ConsumidorFinal').up()
                            .ele('AccountID').txt('Desconhecido').up()
                            .ele('CustomerTaxID').txt('999999999').up()
                            .ele('CompanyName').txt('Consumidor Final').up()
                            .ele('BillingAddress')
                                .ele('AddressDetail').txt('Desconhecido').up()
                                .ele('City').txt('Desconhecido').up()
                                .ele('PostalCode').txt('*').up()
                                .ele('Country').txt('AO').up()
                            .up()
                            .ele('SelfBillingIndicator').txt('0').up()
                        .up(); // End Customer Default
            
            // Add Real Customers
            clientes.forEach(c => {
                doc.ele('Customer')
                    .ele('CustomerID').txt(c.id.toString()).up()
                    .ele('AccountID').txt('Desconhecido').up()
                    .ele('CustomerTaxID').txt(c.cpf_cnpj || '999999999').up()
                    .ele('CompanyName').txt(c.nome).up()
                    .ele('BillingAddress')
                        .ele('AddressDetail').txt(c.endereco || 'Desconhecido').up()
                        .ele('City').txt(c.cidade || 'Luanda').up()
                        .ele('PostalCode').txt('*').up()
                        .ele('Country').txt('AO').up()
                    .up()
                    .ele('SelfBillingIndicator').txt('0').up()
                .up();
            });

            // Add Products
            produtos.forEach(p => {
                doc.ele('Product')
                    .ele('ProductType').txt(p.tipo === 'servico' ? 'S' : 'P').up()
                    .ele('ProductCode').txt(p.id.toString()).up()
                    .ele('ProductGroup').txt(p.categoria || 'Geral').up()
                    .ele('ProductDescription').txt(p.nome).up()
                    .ele('ProductNumberCode').txt(p.id.toString()).up()
                .up();
            });

            // TaxTable (Simplified)
            doc.ele('TaxTable')
                .ele('TaxTableEntry')
                    .ele('TaxType').txt('IVA').up()
                    .ele('TaxCountryRegion').txt('AO').up()
                    .ele('TaxCode').txt('NOR').up()
                    .ele('Description').txt('Taxa Normal').up()
                    .ele('TaxPercentage').txt('14.00').up()
                .up()
                .ele('TaxTableEntry')
                    .ele('TaxType').txt('IVA').up()
                    .ele('TaxCountryRegion').txt('AO').up()
                    .ele('TaxCode').txt('ISE').up()
                    .ele('Description').txt('Isento').up()
                    .ele('TaxPercentage').txt('0.00').up()
                .up()
            .up();

            doc.up(); // End MasterFiles

            // SourceDocuments
            const salesInvoices = doc.ele('SourceDocuments').ele('SalesInvoices');
            
            let totalCredit = 0;
            let totalDebit = 0;

            salesInvoices.ele('NumberOfEntries').txt(vendas.length).up();
            salesInvoices.ele('TotalDebit').txt('0.00').up();
            salesInvoices.ele('TotalCredit').txt(vendas.reduce((acc, v) => acc + (v.total || 0), 0).toFixed(2)).up();

            vendas.forEach(v => {
                const invoice = salesInvoices.ele('Invoice');
                invoice.ele('InvoiceNo').txt(`FT SGVA/${year}/${v.id}`).up();
                invoice.ele('DocumentStatus')
                    .ele('InvoiceStatus').txt('N').up()
                    .ele('InvoiceStatusDate').txt(v.data_venda).up()
                    .ele('SourceID').txt(v.usuario_id.toString()).up()
                    .ele('SourceBilling').txt('P').up()
                .up();
                invoice.ele('Hash').txt('0').up(); // TODO: Implement Hash
                invoice.ele('HashControl').txt('1').up();
                invoice.ele('Period').txt(month).up();
                invoice.ele('InvoiceDate').txt(v.data_venda.split('T')[0]).up();
                invoice.ele('InvoiceType').txt('FT').up(); // Fatura
                invoice.ele('SpecialRegimes')
                    .ele('SelfBillingIndicator').txt('0').up()
                    .ele('CashVATSchemeIndicator').txt('0').up()
                    .ele('ThirdPartiesBillingIndicator').txt('0').up()
                .up();
                invoice.ele('SourceID').txt(v.usuario_id.toString()).up();
                invoice.ele('SystemEntryDate').txt(v.data_venda).up();
                invoice.ele('CustomerID').txt(v.cliente_id ? v.cliente_id.toString() : 'ConsumidorFinal').up();

                // Lines
                const vItens = itens.filter(i => i.venda_id === v.id);
                let lineNum = 1;
                vItens.forEach(item => {
                    const line = invoice.ele('Line');
                    line.ele('LineNumber').txt(lineNum++).up();
                    line.ele('ProductCode').txt(item.produto_id.toString()).up();
                    line.ele('ProductDescription').txt(item.descricao).up();
                    line.ele('Quantity').txt(item.quantidade).up();
                    line.ele('UnitOfMeasure').txt('Unid').up();
                    line.ele('UnitPrice').txt(item.preco_unitario.toFixed(2)).up();
                    line.ele('TaxBase').txt(item.subtotal.toFixed(2)).up();
                    line.ele('TaxPointDate').txt(v.data_venda.split('T')[0]).up();
                    line.ele('References')
                        .ele('CreditNote').ele('Reference').txt('N/A').up().up()
                    .up();
                    line.ele('Description').txt(item.descricao).up();
                    line.ele('DebitAmount').txt('0.00').up();
                    line.ele('CreditAmount').txt(item.subtotal.toFixed(2)).up();
                    
                    // Tax (Default to Normal for now, needs logic)
                    line.ele('Tax')
                        .ele('TaxType').txt('IVA').up()
                        .ele('TaxCountryRegion').txt('AO').up()
                        .ele('TaxCode').txt('NOR').up()
                        .ele('TaxPercentage').txt('14.00').up()
                    .up();
                    line.up(); // End Line
                });

                invoice.ele('DocumentTotals')
                    .ele('TaxPayable').txt('0.00').up() // Calc inputs
                    .ele('NetTotal').txt(v.subtotal.toFixed(2)).up()
                    .ele('GrossTotal').txt(v.total.toFixed(2)).up()
                .up();

                invoice.up(); // End Invoice
            });

            const xml = doc.end({ prettyPrint: true });

            res.header('Content-Type', 'application/xml');
            res.attachment(`SAFT_AO_${year}_${month}.xml`);
            res.send(xml);

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = SaftController;
