# Oferta Radar

Aplicativo de ofertas e links de afiliado com vitrine pública e área pessoal protegida por conta.

## Recursos

- Vitrine de ofertas pública, com busca, filtros e ordenação.
- Cadastro e entrada com nome, e-mail e senha exclusiva do Oferta Radar.
- Senhas armazenadas com hash bcrypt; a API emite tokens assinados com validade de sete dias.
- Área pessoal para guardar e excluir seus links de afiliado.
- Publicação de ofertas identificadas pelo usuário responsável.
- Painel individual com cliques em ofertas e links, além de comissões registradas manualmente.
- Dados de links, publicações e comissões isolados por conta.
- Validação de links HTTP/HTTPS e limite de tentativas de cadastro e entrada.
- Interface responsiva com tema laranja e branco.

## Importante sobre a entrada

A tela de entrar/criar conta está integrada ao front-end, mas a autenticação real depende do backend. No GitHub Pages, preencha \`window.OFERTA_RADAR_API_URL\` no arquivo \`config.js\` com a URL HTTPS do backend publicado. Enquanto a URL estiver vazia, o app mostra a vitrine de demonstração e informa que a API de contas ainda não foi ativada.

O token de acesso é enviado no cabeçalho Authorization. O servidor valida a assinatura e o prazo de validade em cada solicitação. Senhas nunca são devolvidas pela API ou exibidas na interface.

## Executar localmente

Requer Node.js 20 ou superior.

1. Entre em \`oferta-radar/backend\`.
2. Execute \`npm install\`.
3. Copie \`.env.example\` para \`.env\` e configure \`AUTH_SECRET\` com uma chave aleatória de pelo menos 32 caracteres.
4. Execute \`npm start\`.
5. Acesse \`http://localhost:3000\`.

## Publicar no Render

O arquivo \`render.yaml\` cria um serviço Node com disco persistente e gera automaticamente o segredo \`AUTH_SECRET\`. Revise o plano e o custo no Render antes de criar o serviço. A URL final do backend deve ser colocada em \`oferta-radar/config.js\` e o site estático deve ser publicado novamente no GitHub Pages.

## Programas oficiais de afiliados

- Amazon Associados: https://associados.amazon.com.br/
- Mercado Livre Afiliados: https://www.mercadolivre.com.br/l/afiliados-home
- Shopee Afiliados: https://affiliate.shopee.com.br/
- Lomadee: https://www.lomadee.com.br/pt-br/afiliados

A inscrição e aprovação são feitas diretamente com cada parceiro. O Oferta Radar não guarda senhas dessas plataformas. Vendas e comissões não são importadas automaticamente: informe no painel apenas valores conferidos no portal oficial.

## Ofertas e transparência

O catálogo de demonstração contém valores fictícios e está marcado como exemplo. A primeira versão não importa automaticamente preços, imagens, estoque ou cupons. Produtos reais precisam ser enviados manualmente, com informações verificadas.

Os links publicados são públicos e podem gerar comissão para quem os divulga. A validação de URL verifica apenas formato e protocolo; não garante que o destino seja autêntico ou seguro. Revise os documentos legais e a política de privacidade antes da abertura ao público.
