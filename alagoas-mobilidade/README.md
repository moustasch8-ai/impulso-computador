# Alagoas Mobilidade

Plataforma de caronas compartilhadas entre municípios de Alagoas e outros estados, com identidade própria e referência no modelo de viagens compartilhadas.

## Funcionalidades implementadas
- Interface responsiva em português, laranja e branco.
- Cadastro e login via Supabase Auth.
- Perfis de passageiro e motorista; motoristas iniciam pendentes e precisam de aprovação administrativa.
- Publicação de caronas com origem/destino e UF, data/hora, assentos, preço por assento, veículo e observações.
- Busca por cidade, estado, data e número de assentos.
- Reserva transacional de assentos no PostgreSQL, com bloqueio concorrente.
- Reservas pendentes de pagamento expiram após 15 minutos e liberam assentos quando o app executa a rotina de expiração.
- Estrutura para pagamentos PIX/cartão via Mercado Pago Checkout Pro e webhook para confirmação.
- Tabelas de avaliações para viagens concluídas.
- RLS para perfis, ofertas, reservas, pagamentos e avaliações.

## Projeto conectado
- Supabase: `lmddodyzurpxswvnfsnv` (região São Paulo).
- Frontend usa apenas a chave pública publishable, protegida por RLS.
- Site: https://alagoas-mobilidade.onrender.com
- Repositório: https://github.com/moustasch8-ai/impulso-computador

## Configuração de pagamentos
As Edge Functions `create-checkout` e `mercado-pago-webhook` já estão publicadas no Supabase. Para ativar cobranças reais:

1. Crie/valide sua aplicação e credenciais no [Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt).
2. No Supabase, abra **Edge Functions → Secrets** e adicione `MERCADOPAGO_ACCESS_TOKEN` com o Access Token de teste para homologação; depois troque para produção quando estiver pronto.
3. Opcionalmente adicione `APP_SITE_URL=https://alagoas-mobilidade.onrender.com`.
4. Configure no Mercado Pago a URL de notificações indicada pela função: `https://lmddodyzurpxswvnfsnv.supabase.co/functions/v1/mercado-pago-webhook`.
5. Faça testes com contas e cartões/PIX de teste antes de receber valores reais.

**Atenção:** sem o secret `MERCADOPAGO_ACCESS_TOKEN`, o checkout retorna uma mensagem de configuração ausente e não cobra nada. Nesta primeira integração, o checkout recebe na conta Mercado Pago da plataforma. O repasse automático/split para cada motorista ainda depende de conectar as contas dos motoristas por OAuth e configurar o modelo marketplace apropriado. Não anuncie repasse automático antes dessa etapa.

## Administrador e aprovação de motoristas
1. Crie uma conta normal no aplicativo.
2. No SQL Editor do Supabase, atribua o papel de administrador à conta (substitua pelo e-mail correto):
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role','admin')
where lower(email) = lower('SEU_EMAIL_DE_ADMINISTRACAO');
```
3. Saia e entre novamente. O painel administrativo permitirá aprovar ou rejeitar cadastros de motorista.

A aprovação do perfil não substitui a verificação documental de identidade, CNH e veículo. A equipe deve realizar essa conferência antes de liberar o motorista.

## Banco de dados
- `profiles`: perfis e aprovação.
- `ride_offers`: caronas publicadas.
- `bookings`: reservas e assentos.
- `payments`: transações e estado do provedor.
- `reviews`: avaliações.
- `rides`: tabela legada de pedidos do protótipo anterior, preservada sem uso na nova experiência.

O arquivo `supabase/schema.sql` documenta a estrutura e as políticas da versão de caronas. A migração aplicada está em `supabase/migrations/20261124_carpool_marketplace.sql`.

## Limitações antes de operar
- O checkout depende de credenciais do Mercado Pago e testes reais em ambiente de homologação.
- O split e repasse automático aos motoristas ainda não foi conectado via OAuth.
- Ainda faltam mapas/geolocalização, notificações, chat, fluxo de cancelamento e reembolso completo, avaliação pela interface, suporte operacional e auditoria documental.
- É necessário revisar os requisitos legais, tributários, de proteção de dados e regras aplicáveis ao transporte compartilhado em cada estado antes do lançamento comercial.
