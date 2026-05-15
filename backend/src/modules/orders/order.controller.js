const orderService = require('./order.service');

const list = async (req, res) => {
  const pedidos = await orderService.list();

  return res.json(pedidos);
};

const create = async (req, res) => {
  const pedido = await orderService.create(req.body);

  return res.status(201).json(pedido);
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const pedido = await orderService.updateStatus(id, status);

  return res.json(pedido);
};

module.exports = {
  list,
  create,
  updateStatus,
};
