# Alagoas Mobilidade

Protótipo inicial de uma plataforma de corridas locais planejada para atender os 102 municípios de Alagoas.

## Abrir o protótipo
Abra `index.html` no navegador. A interface é responsiva e não exige instalação.

## O que já funciona nesta etapa
- Interface em português com identidade visual laranja e branco.
- Seleção de municípios de Alagoas para origem e destino.
- Formulário de solicitação demonstrativa.
- Seleção da forma de pagamento: dinheiro, PIX ou cartão.
- Forma de pagamento escolhida exibida no pedido da área demonstrativa do motorista.
- Registro local de pedidos no navegador.
- Aba de demonstração para visualizar pedidos no mesmo navegador.

## Limitações importantes
Esta versão é somente um protótipo front-end. Os pedidos ficam no armazenamento local do navegador e **não são compartilhados com motoristas ou passageiros em outros aparelhos**. Não há autenticação, mapa em tempo real, cálculo de tarifa, cobrança PIX/cartão, despacho de motoristas ou confirmação de corrida. A seleção de pagamento é apenas uma preferência registrada no protótipo; nenhum valor é cobrado.

## Próximas etapas
1. Criar backend e banco de dados compartilhado.
2. Implementar cadastro e autenticação segura para passageiros e motoristas.
3. Validar documentos e veículos dos motoristas.
4. Integrar mapas, geolocalização e rotas.
5. Criar despacho de corridas e notificações em tempo real.
6. Integrar um provedor de pagamentos para gerar cobranças PIX e processar cartões com segurança; dinheiro será acertado diretamente entre passageiro e motorista.
7. Implementar conciliação, estornos, comprovantes e tratamento de falhas de pagamento.
6. Implementar tarifas, suporte, segurança e políticas de privacidade.
7. Revisar requisitos legais e regulatórios antes da operação comercial.

## Publicação
O projeto está dentro da pasta `alagoas-mobilidade/` do repositório principal. Para publicar essa pasta como site independente, configure o GitHub Pages ou use um serviço de hospedagem com a pasta como diretório público.
