# Oferta Radar

Aplicativo público de ofertas e links de afiliado. Não exige cadastro, conta ou login para consultar ofertas, adicionar produtos ou guardar links.

## O que está pronto no código

- Vitrine com busca, filtros por loja, categoria e desconto mínimo, e ordenação.
- Amostra de demonstração claramente identificada com preços fictícios.
- Formulário público de inclusão de produtos, com link original obrigatório e link de afiliado opcional.
- Validação de links HTTP/HTTPS no navegador e no servidor.
- Formulário público de links de afiliado; os links cadastrados ficam visíveis no mural público.
- Contagem de cliques quando o redirecionamento passa pelo servidor.
- Modo local para testes em GitHub Pages: os cadastros ficam apenas no navegador/dispositivo que os enviou.
- Limite de 20 envios por hora por endereço IP no backend, para reduzir spam.
- Página inicial de privacidade e termos para revisão antes do lançamento.

## Sem cadastro: como funciona

O catálogo e o mural são compartilhados. Qualquer visitante pode enviar produtos e links; as informações cadastradas ficam públicas para todos. Não há área privada nem carteira de comissões nesta versão. Consulte vendas e comissões nos painéis oficiais dos programas de afiliados.

No GitHub Pages, sem a URL do backend configurada em config.js, os formulários usam armazenamento local do navegador. Isso não publica o conteúdo para outros visitantes e não sincroniza dispositivos. Para que um produto enviado apareça para todos, publique o backend.

## Pré-visualização

https://moustasch8-ai.github.io/impulso-computador/oferta-radar/

O catálogo poderá mostrar exemplos fictícios para pré-visualização; eles são marcados como demonstração e não têm links de compra.

## Executar com backend

Requer Node.js 20 ou superior.

1. Entre na pasta oferta-radar/backend.
2. Execute npm install.
3. Copie .env.example para .env.
4. Execute npm start.
5. Abra http://localhost:3000.

O backend serve a interface e a API no mesmo domínio. A API pública não cria contas nem solicita senhas.

## Publicar no Render

O arquivo render.yaml contém uma configuração inicial de Web Service Node com disco persistente. Revise o plano e os custos no Render antes de aprovar a criação. O banco usa /var/data/oferta-radar.sqlite.

## Programas oficiais de afiliados

- Amazon Associados: https://associados.amazon.com.br/
- Mercado Livre Afiliados: https://www.mercadolivre.com.br/l/afiliados-home
- Shopee Afiliados: https://affiliate.shopee.com.br/
- Lomadee: https://www.lomadee.com.br/pt-br/afiliados

Inscreva-se diretamente no parceiro, aguarde aprovação e gere seu link no portal oficial. O Oferta Radar não pede nem guarda senhas dessas plataformas.

## Ofertas e preços

A primeira versão não faz scraping. O catálogo é alimentado por envios manuais. A importação automática de produtos, preços, imagens, estoque, cupons ou comissões precisa usar APIs ou feeds autorizados, respeitando termos, limites e políticas de cada parceiro.

## Transparência e segurança

- O envio é público e não exige cadastro.
- Links enviados ficam visíveis a todos os visitantes.
- O servidor limita envios por IP, mas não substitui moderação.
- Links são validados quanto à sintaxe e aos protocolos HTTP/HTTPS; isso não garante que o destino seja seguro, permaneça ativo ou pertença à loja declarada.
- Preços, cupons e disponibilidade devem ser conferidos no destino antes de divulgar.
- Cliques são contabilizados apenas quando passam pelo redirecionador do servidor.
- Vendas e comissões precisam ser conferidas nos painéis oficiais dos parceiros.
- Revise os documentos legais, a LGPD, retenção de dados e canal de contato antes de abrir ao público.


## Integração GitHub Pages + API

- A página carrega config.js antes do aplicativo.
- Configure window.OFERTA_RADAR_API_URL com a URL HTTPS do backend após o deploy.
- O backend habilita CORS somente para os domínios em FRONTEND_ORIGINS.
- O workflow de Pages copia config.js e valida a sintaxe de config.js, app.js e backend/server.js.
- Quando a API está ativa, produtos e links são compartilhados e os redirecionamentos /go/:id e /r/:id registram cliques.
- Sem API, o navegador salva os itens localmente; isso não equivale a um catálogo público compartilhado.
