# Backend Tests

Estrutura reservada para testes automatizados do backend MVC.

Casos prioritarios:

- Criacao de pedido/venda com baixa de estoque.
- Voltar pedido exigindo motivo e registrando historico.
- Recuperar pedido pronto ou entregue para `em_preparo`.
- Bloquear entrega quando pedido ainda nao esta pronto ou possui itens fora da expedicao.
- Abrir, movimentar e fechar caixa pelo modulo `cash`.
