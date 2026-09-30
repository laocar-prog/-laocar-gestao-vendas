# Laocar v85

Totais ao final dos relatórios de estoque ativo, vendidos, vendas e faturamento. Valores somados em centavos. Vendas por vendedor com filtro opcional de mês e vendedor; seção e subtotal para cada vendedor, inclusive pedidos sem vendedor vinculado.

Fechamento mensal pela data do pedido (`sale_date`), somente vendas efetivadas. Mostra custos conhecidos; custo ausente não é tratado como zero para apurar o resultado bruto. O fechamento é uma consulta atualizada dos dados, não bloqueia nem congela lançamentos.

Arquivo separado `sold_vehicle_archive`, com RLS por loja, sincronizado por trigger SECURITY INVOKER. A view `sold_vehicle_inventory` usa security_invoker e mantém os veículos originais para preservar os vínculos com vendas, fotos e documentos. Cancelar/reabrir a venda retira o veículo do arquivo quando o status volta ao estoque.

Validação: sintaxe do bundle; testes de somas em centavos, agrupamentos, status, filtros, meses vazios, virada do mês e ano bissexto, custos ausentes, escaping e paginação com 2501 registros. SQL testado como usuário autenticado: saída/entrada do arquivo e isolamento de usuário sem loja, em transação revertida. Dados atuais conferidos: 3 veículos ativos, total R$ 105.980,00; 1 vendido; setembro de 2026 com 1 venda efetivada e R$ 37.990,00.

Bundle atualizado a partir do v84, preservando demais módulos. `reports.js` guarda a fonte legível dos novos relatórios e `test-reports.cjs` valida com dados fictícios. `sold-vehicle-archive.sql` é o DDL já aplicado, não deve ser executado novamente.
