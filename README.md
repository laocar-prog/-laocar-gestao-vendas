# Laocar Gestão de Vendas — versão final integrada

Módulos: login, dashboard, estoque, fotos privadas, clientes, vendas, documentos/assinaturas, anúncios, relatórios e configurações.

## Executar
1. Copie `.env.example` para `.env`.
2. `npm install`
3. `npm run dev`

O frontend usa apenas a chave publicável do Supabase. Nunca coloque service_role/secret keys no cliente.

## Integrações externas
A consulta automática de placa/FIPE depende do token do provedor já esperado pela Edge Function `vehicle-create`.
