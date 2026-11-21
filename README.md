# Impulso — versão computador

Aplicativo web para computador, com interface responsiva e painéis de descoberta de criadores, desafios, dicas, perfil, seguidores registrados e sugestões para seguir. A integração OAuth foi preparada para a **Instagram API with Instagram Login** da Meta.

> O projeto é um protótipo local. Os perfis exibidos na área Explorar são dados fictícios para demonstração. A vitrine, os registros de seguidores e os perfis salvos ficam no navegador atual; ainda não existe diretório compartilhado entre usuários.

## Funcionalidades

- **Explorar:** pesquisa e filtros de criadores por categoria. Os perfis desta seção são exemplos fictícios.
- **Desafios:** tarefas simples para planejar conteúdo e interagir com a comunidade.
- **Dicas:** orientações para conteúdo original e crescimento orgânico.
- **Meu perfil:** salva localmente o @ do Instagram, permite ativar/pausar a vitrine demonstrativa e compartilhar o link público do perfil.
- **Seguidores:** histórico local de pessoas que o usuário registrou manualmente como tendo encontrado o perfil pelo Impulso e confirmado que seguiram.
- **Sugestões para seguir:** temas e hashtags que abrem buscas públicas no Instagram. A escolha de seguir é sempre manual.
- **Instagram:** fluxo de autorização OAuth e painel para métricas de uma conta profissional autorizada, após configuração do app Meta.

## O que a integração do Instagram faz

- Login OAuth oficial com conta profissional do Instagram (Criador ou Empresa).
- Consulta de perfil autorizado, incluindo nome de usuário, tipo de conta, seguidores atuais e publicações.
- Consulta de métricas de conta, conforme permissões e disponibilidade da API.
- Tentativa de renovação do token de longa duração quando elegível.
- Desconexão da conta.

**Não** automatiza seguir/deixar de seguir, curtir, comentar em massa, reproduzir vídeos ou gerar seguidores/visualizações artificiais. Métricas e sugestões não garantem crescimento.

## Requisitos

- Node.js 20 ou superior.
- Uma conta Instagram profissional: Criador ou Empresa.
- Uma conta Meta for Developers e um aplicativo configurado com Instagram API with Instagram Login.

## Executar localmente

No terminal, dentro desta pasta:

    npm install

Copie o arquivo .env.example para .env.

No Windows PowerShell:

    Copy-Item .env.example .env

No macOS/Linux:

    cp .env.example .env

Gere uma chave de sessão aleatória:

    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

Cole o resultado no campo SESSION_SECRET do arquivo .env. Para abrir a interface sem conectar Instagram, basta definir essa chave e executar:

    npm start

Abra http://localhost:3000.

## Configurar Instagram Login (opcional)

1. Acesse [Meta for Developers](https://developers.facebook.com/apps/) e crie um aplicativo conforme a configuração atual da Meta.
2. Adicione/configure Instagram API with Instagram Login.
3. Cadastre como URI de retorno OAuth exatamente o endereço escolhido em INSTAGRAM_REDIRECT_URI. Para teste local, use http://localhost:3000/auth/instagram/callback.
4. Solicite as permissões necessárias para ler o perfil profissional e as métricas que deseja consultar. A disponibilidade depende do produto, do tipo de conta e da análise da Meta.
5. Coloque o App ID e App Secret no arquivo .env local. **Nunca** coloque o App Secret, tokens ou credenciais no JavaScript do navegador nem faça commit do arquivo .env.
6. Para permitir que outras pessoas autorizem suas contas, verifique os requisitos de acesso avançado, análise do app e políticas da Meta.

O nome das permissões, os escopos e os requisitos do produto podem mudar. Consulte sempre a documentação oficial da Meta antes de publicar ou solicitar acesso.

## Divulgação do perfil e painéis locais

- **Ativar vitrine** salva o estado somente no navegador atual. Isso não publica o perfil para outros usuários do Impulso e não faz o Instagram recomendar a conta automaticamente.
- **Compartilhar convite** usa a função de compartilhamento do dispositivo/navegador ou copia o link público do Instagram.
- **Seguidores** é um histórico manual de confirmações, não uma lista obtida do Instagram e não altera a contagem oficial.
- **Sugestões para seguir** são pesquisas públicas por hashtag/assunto. Não são recomendações oficiais e não executam ações de seguir automaticamente.

Para tornar a vitrine pública e os painéis compartilhados, ainda é necessário desenvolver cadastro/login de usuários, API de backend, banco de dados, moderação, controles anti-spam, política de privacidade e controles de exclusão/exportação de dados.

## Segurança e limitações do protótipo

- O App Secret e o access token são mantidos no servidor, não no JavaScript do navegador.
- O fluxo OAuth usa parâmetro state aleatório para proteção contra CSRF.
- Cookies da sessão usam HttpOnly e SameSite=Lax; Secure é habilitado quando NODE_ENV=production.
- O servidor usa o armazenamento de sessão em memória padrão do express-session, adequado apenas para desenvolvimento local. **Não hospede em produção no estado atual.**
- Antes de produção, use armazenamento persistente de sessão, criptografia de tokens em repouso, HTTPS, gerenciamento de segredos, limites de requisição, política de privacidade e fluxo de exclusão de dados.
- A disponibilidade das métricas e seus limites variam conforme a API e a conta.

## Estrutura

- index.html, styles.css, app.js: interface, estilo e interações.
- server.js: servidor local, OAuth e chamadas à API do Instagram.
- .env.example: modelo sem credenciais.
- assets/icon.svg: ícone.
- .gitignore: exclui .env, dependências e arquivos locais.

## Repositório

Este projeto está em [moustasch8-ai/impulso-computador](https://github.com/moustasch8-ai/impulso-computador).

## Referências

- [Instagram Platform — documentação oficial](https://developers.facebook.com/docs/instagram-platform/)
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Meta for Developers](https://developers.facebook.com/)


## Site público (GitHub Pages)

O site institucional está em `site/` e a demonstração do painel em `site/painel/`.

- Página inicial: https://moustasch8-ai.github.io/impulso-computador/
- Demonstração do painel: https://moustasch8-ai.github.io/impulso-computador/painel/
- Código-fonte: https://github.com/moustasch8-ai/impulso-computador

### Ativar a publicação

1. Abra **Settings → Pages** no repositório.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Abra a aba **Actions** e acompanhe o workflow **Publish Impulso website**.
4. Quando a execução terminar com sucesso, o site estará disponível no endereço acima.

O workflow `.github/workflows/pages.yml` publica automaticamente o conteúdo da pasta `site/` sempre que ela for atualizada na branch `main`. Esta configuração segue o fluxo recomendado pelo GitHub Pages.

### Limites da demonstração hospedada

O GitHub Pages hospeda apenas arquivos estáticos. A demonstração permite navegar pelo painel e guardar algumas preferências no armazenamento local do navegador. A autenticação OAuth e as chamadas reais à API do Instagram precisam do servidor Node.js configurado e hospedado separadamente; por segurança, o App Secret e tokens nunca devem ser colocados nos arquivos publicados do Pages.
