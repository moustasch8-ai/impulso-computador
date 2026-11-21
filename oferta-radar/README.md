# Oferta Radar

Aplicativo de ofertas e marketing de afiliados. Esta pasta é independente do app anterior.

## O que está pronto no código

- Vitrine com busca, loja, categoria, desconto mínimo e ordenação.
- Modo de demonstração com preços fictícios claramente identificados.
- Cadastro e login; senha armazenada como hash bcrypt.
- Banco SQLite e sessões HTTP-only.
- Links de afiliado salvos por usuário e redirecionamento com contagem de cliques.
- Cadastro de promoções com preço anterior, preço atual, cupom, validade e links.
- Registro manual de comissões, claramente separado de confirmação da rede.
- Páginas iniciais de termos e privacidade.

## Pré-visualização

Quando a pasta estiver na branch publicada pelo GitHub Pages, o frontend pode ser aberto em:

https://moustasch8-ai.github.io/impulso-computador/oferta-radar/

Clique nas abas. O catálogo de demonstração usa produtos, preços e lojas fictícios e não permite compra.

## Executar com backend

Requer Node.js 20 ou superior.

1. Entre em oferta-radar/backend.
2. Execute npm install.
3. Copie .env.example para .env.
4. Troque SESSION_SECRET por um segredo aleatório de 32 caracteres ou mais.
5. Execute npm start.
6. Abra http://localhost:3000.

O backend serve os arquivos estáticos e a API no mesmo domínio. O catálogo fica vazio até que ofertas sejam cadastradas.

## Publicar no Render

O arquivo render.yaml contém uma configuração inicial de Web Service Node e disco persistente. Revise o plano e os custos no Render antes de aprovar a criação. Configure HTTPS e mantenha SESSION_SECRET como segredo. DATABASE_PATH está configurado para /var/data/oferta-radar.sqlite.

## Como começar a se afiliar

- Amazon Associados: https://associados.amazon.com.br/
- Mercado Livre Afiliados: https://www.mercadolivre.com.br/l/afiliados-home
- Shopee Afiliados: https://affiliate.shopee.com.br/
- Lomadee: https://www.lomadee.com.br/pt-br/afiliados

Inscreva-se diretamente no parceiro, aguarde aprovação e gere o link dentro da plataforma oficial. Depois entre em Meus links e salve seu link. O Oferta Radar não pede senhas dessas plataformas.

## Dados de ofertas e preços

Esta primeira versão não faz scraping. O catálogo recebe ofertas cadastradas manualmente. Importação automática de produtos, preços, imagens, estoque, cupons ou comissões deverá usar APIs ou feeds autorizados e respeitar termos, limites e políticas do parceiro. A API de Produtos da Amazon, por exemplo, exige conta de Associado e acesso aos recursos da API.

## Limitações e segurança

- Os cliques contam apenas quando passam pelos links rastreáveis do Oferta Radar.
- Vendas e comissões precisam ser confirmadas no painel da rede; o formulário de comissão é manual.
- Não cole senhas, tokens ou chaves de API nos formulários.
- Use HTTPS, disco persistente, backups e segredos privados em produção.
- Revise estes documentos, a LGPD e o canal de contato antes do lançamento público.
