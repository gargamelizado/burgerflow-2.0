const cashService = require('./cash.service');

const getUserId = (req) => req.user?.id || req.usuario?.id || req.userId || null;
const getUserLevel = (req) =>
  req.user?.nivel_acesso || req.usuario?.nivel_acesso || null;
const getGerencialToken = (req) =>
  req.headers['x-gerencial-token'] ||
  req.body?.gerencial_token ||
  req.body?.token_gerencial ||
  null;
const getGerencialReason = (req) =>
  req.body?.motivo_autorizacao || req.body?.motivo || req.body?.observacao || '';

const getOpen = async (req, res) => {
  const resultado = await cashService.getOpen();

  return res.json(resultado);
};

const open = async (req, res) => {
  const resultado = await cashService.open({
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
    numero: req.body.numero,
    operador_id: req.body.operador_id,
    valor_inicial: req.body.valor_inicial,
    observacao: req.body.observacao,
    gerencial_token: getGerencialToken(req),
    motivo_autorizacao: getGerencialReason(req),
  });

  return res.status(201).json(resultado);
};

const close = async (req, res) => {
  const resultado = await cashService.close({
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
    valor_final: req.body.valor_final,
    observacao: req.body.observacao,
    gerencial_token: getGerencialToken(req),
    motivo_autorizacao: getGerencialReason(req),
  });

  return res.json(resultado);
};

const createMovement = async (req, res) => {
  const resultado = await cashService.createMovement({
    caixa_id: req.body.caixa_id,
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
    tipo: req.body.tipo,
    valor: req.body.valor,
    motivo: req.body.motivo,
    gerencial_token: getGerencialToken(req),
    motivo_autorizacao: getGerencialReason(req),
  });

  return res.status(201).json(resultado);
};

const listMovements = async (req, res) => {
  const resultado = await cashService.listMovements(req.query.caixa_id);

  return res.json(resultado);
};

const listOpenCashes = async (req, res) => {
  const caixas = await cashService.listOpenCashes();

  return res.json({
    caixas,
  });
};

const getCashById = async (req, res) => {
  const caixa = await cashService.getById(req.params.id);

  return res.json({
    caixa,
  });
};

const listSalesByCash = async (req, res) => {
  const resultado = await cashService.listSalesByCash(req.params.id);

  return res.json(resultado);
};

const openCashByNumber = async (req, res) => {
  const resultado = await cashService.open({
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
    numero: req.body.numero,
    operador_id: req.body.operador_id,
    valor_inicial: req.body.valor_inicial,
    observacao: req.body.observacao,
    gerencial_token: getGerencialToken(req),
    motivo_autorizacao: getGerencialReason(req),
  });

  return res.status(201).json(resultado);
};

const closeCashById = async (req, res) => {
  const resultado = await cashService.closeById({
    caixa_id: req.params.id,
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
    valor_final: req.body.valor_final,
    observacao: req.body.observacao,
    gerencial_token: getGerencialToken(req),
    motivo_autorizacao: getGerencialReason(req),
  });

  return res.json(resultado);
};

const testOpenCashes = async (req, res) => {
  const resultado = await cashService.openManyForTest({
    quantidade: req.body.quantidade,
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
  });

  return res.status(201).json(resultado);
};

const testSellInCashes = async (req, res) => {
  const resultado = await cashService.sellInCashesForTest({
    vendas: req.body.vendas,
    usuario_id: getUserId(req),
    usuario_nivel_acesso: getUserLevel(req),
  });

  return res.json(resultado);
};

module.exports = {
  getOpen,
  open,
  close,
  createMovement,
  listMovements,
  listOpenCashes,
  getCashById,
  listSalesByCash,
  openCashByNumber,
  closeCashById,
  testOpenCashes,
  testSellInCashes,
};
