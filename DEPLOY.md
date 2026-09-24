# Publicação do Laocar

## Vercel
1. Importe esta pasta/ZIP em um projeto Vite.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores do `.env.example`.
5. Publique.

## iPhone
Depois de publicado, abra o endereço no Safari → Compartilhar → Adicionar à Tela de Início.

## Produção
A chave usada no navegador é a chave publicável do Supabase. Nunca use service_role/secret key no frontend.
A consulta automática de placa/FIPE requer o token do provedor configurado no backend.
