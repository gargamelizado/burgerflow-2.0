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

const correctStatus = async (req, res) => {
  const result = await orderService.correctStatus({
    id: req.params.id,
    status: req.body?.status,
    actorUserId: req.user?.id,
    actorUserLevel: req.user?.nivel_acesso,
  });

  return res.json(result);
};

module.exports = {
  list,
  create,
  updateStatus,
  correctStatus,
};
