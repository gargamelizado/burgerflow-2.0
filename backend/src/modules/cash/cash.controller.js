const cashService = require('./cash.service');

const getUserId = (req) => req.user?.id || req.usuario?.id || req.userId || null;

const getOpen = async (req, res) => {
  const resultado = await cashService.getOpen();

  return res.json(resultado);
};

const open = async (req, res) => {
  const resultado = await cashService.open({
    usuario_id: getUserId(req),
    valor_inicial: req.body.valor_inicial,
    observacao: req.body.observacao,
  });

  return res.status(201).json(resultado);
};

const close = async (req, res) => {
  const resultado = await cashService.close({
    usuario_id: getUserId(req),
    valor_final: req.body.valor_final,
    observacao: req.body.observacao,
  });

  return res.json(resultado);
};

const createMovement = async (req, res) => {
  const resultado = await cashService.createMovement({
    usuario_id: getUserId(req),
    tipo: req.body.tipo,
    valor: req.body.valor,
    motivo: req.body.motivo,
  });

  return res.status(201).json(resultado);
};

const listMovements = async (req, res) => {
  const resultado = await cashService.listMovements();

  return res.json(resultado);
};

module.exports = {
  getOpen,
  open,
  close,
  createMovement,
  listMovements,
};
