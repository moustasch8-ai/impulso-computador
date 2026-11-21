# Alagoas Mobilidade

Projeto de plataforma de mobilidade local planejada para atender os 102 municípios de Alagoas.

## Recursos preparados nesta versão
- Interface responsiva em português, com identidade visual laranja e branco.
- Cadastro e login separados para passageiros e motoristas (Supabase Auth).
- Confirmação de e-mail e recuperação de senha por e-mail.
- Perfil criado automaticamente para cada conta.
- Cadastro de motorista inicia como **pendente**.
- Painel administrativo para aprovar ou rejeitar motoristas.
- Regras de segurança no banco com Row Level Security (RLS); usuários só podem consultar seu próprio perfil, e somente administradores podem consultar e alterar a fila de aprovação.
- Solicitação demonstrativa de corrida com escolha de pagamento em dinheiro, PIX ou cartão.

## Ativar cadastro e login

O repositório não contém credenciais de backend. Para ativar a autenticação:

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Abra **SQL Editor** no painel do Supabase e execute todo o conteúdo de `supabase/schema.sql`.
3. Abra **Project Settings → API** e copie a URL do projeto e a chave pública (publishable/anon).
4. Edite `supabase-config.js` e substitua os dois valores de exemplo pela URL e chave pública do seu projeto.
5. Em **Authentication → URL Configuration**, configure a URL do site e adicione a URL publicada deste projeto à lista de Redirect URLs. O link de confirmação e recuperação retorna para a página do aplicativo.
6. Publique/atualize o site e crie a primeira conta normalmente.

A chave pública (publishable/anon) é usada no navegador. **Nunca coloque a chave `service_role` no HTML, JavaScript ou GitHub.** O banco usa RLS para restringir os dados.

## Configurar a conta administradora

1. Crie uma conta normal no aplicativo com o e-mail que será usado pela administração.
2. No Supabase, abra o SQL Editor e execute o comando abaixo, trocando o e-mail pelo e-mail real da conta:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where lower(email) = lower('SEU_EMAIL_DE_ADMINISTRACAO');
```

3. Saia da conta no aplicativo e entre novamente. A conta passará a mostrar o painel administrativo.

Somente a conta marcada em `app_metadata` como administradora recebe permissão para aprovar ou rejeitar motoristas.

## Importante sobre aprovação e segurança

O painel permite aprovar ou rejeitar cadastros. A plataforma ainda não recebe nem valida automaticamente CNH, identidade ou documentos do veículo. A equipe deve fazer a conferência desses documentos por um processo seguro antes de aprovar o motorista. Não solicite documentos sensíveis por campos públicos ou mensagens abertas.

## O que ainda não está operacional
- Não há credenciais Supabase reais configuradas neste repositório; por isso, o login só funcionará depois dos passos de configuração acima.
- Os pedidos de corrida atuais continuam sendo uma demonstração local no navegador; não são distribuídos a motoristas em outros celulares.
- Não há despacho em tempo real, geolocalização, mapas, cálculo de tarifas, chat, notificações ou pagamentos reais.
- A escolha de PIX/cartão ainda não gera cobrança. Para isso será necessário integrar um provedor de pagamentos por backend seguro.
- Ainda é necessário construir a etapa de verificação documental, suporte, políticas de privacidade e revisão dos requisitos legais/regulatórios antes de operar comercialmente.

## Publicação
O projeto fica na pasta `alagoas-mobilidade/` do repositório principal. Configure o GitHub Pages para publicar o repositório e use o endereço da pasta do aplicativo para acessar a página.
