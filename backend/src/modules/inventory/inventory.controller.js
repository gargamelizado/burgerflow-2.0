const inventoryService = require('./inventory.service');

const movimentar = async (req, res) => {
  const resultado = await inventoryService.movimentar(req.body);

  return res.json(resultado);
};

const historico = async (req, res) => {
  const resultado = await inventoryService.historico();

  return res.json(resultado);
};

module.exports = {
  movimentar,
  historico,
};