const kitchenService = require('./kitchen.service');

const listOrders = async (req, res) => {
  const pedidos = await kitchenService.listOrders();

  return res.json(pedidos);
};

const updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const pedido = await kitchenService.updateStatus(id, status);

  return res.json(pedido);
};

module.exports = {
  listOrders,
  updateStatus,
};

