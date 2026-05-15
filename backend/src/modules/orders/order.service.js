const orderRepository = require('./order.repository');

const statusPermitidos = ['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'];

const list = async () => {
  return orderRepository.list();
};

const create = async (data) => {
  const numero = await orderRepository.getNextNumber();

  const pedido = {
    numero,
    cliente_nome: data.cliente_nome || 'Cliente',
    tipo: data.tipo || 'balcao',
    total: Number(data.total || 0),
    observacao: data.observacao || '',
  };

  return orderRepository.create(pedido);
};

const updateStatus = async (id, status) => {
  if (!statusPermitidos.includes(status)) {
    const error = new Error('Status de pedido inválido.');
    error.statusCode = 400;
    throw error;
  }

  const pedido = await orderRepository.findById(id);

  if (!pedido) {
    const error = new Error('Pedido não encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return orderRepository.updateStatus(id, status);
};

module.exports = {
  list,
  create,
  updateStatus,
};