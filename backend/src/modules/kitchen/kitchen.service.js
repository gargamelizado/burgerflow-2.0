const kitchenRepository = require('./kitchen.repository');

const statusPermitidos = ['novo', 'em_preparo', 'pronto', 'entregue'];

const listOrders = async () => {
  return kitchenRepository.listOrders();
};

const updateStatus = async (id, status) => {
  if (!statusPermitidos.includes(status)) {
    const error = new Error('Status inválido para cozinha.');
    error.statusCode = 400;
    throw error;
  }

  const pedido = await kitchenRepository.findById(id);

  if (!pedido) {
    const error = new Error('Pedido não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return kitchenRepository.updateStatus(id, status);
};

module.exports = {
  listOrders,
  updateStatus,
};

