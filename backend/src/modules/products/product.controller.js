const productService = require('./product.service');

const parseBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return value === 'true' || value === '1';
};

const list = async (req, res) => {
  const itens = await productService.list({
    tipo: req.query.tipo,
    categoria: req.query.categoria,
    ativo: parseBoolean(req.query.ativo),
  });

  return res.json(itens);
};

const listByType = (tipo) => async (req, res) => {
  const itens = await productService.list({
    tipo,
    categoria: req.query.categoria,
    ativo: parseBoolean(req.query.ativo),
  });

  return res.json(itens);
};

const listCardapio = async (req, res) => {
  const itens = await productService.listCardapio({
    categoria: req.query.categoria,
    tipo: req.query.tipo,
  });

  return res.json(itens);
};

const getById = async (req, res) => {
  const item = await productService.findDetails(req.params.id);

  return res.json(item);
};

const create = (forcedType) => async (req, res) => {
  const item = await productService.create(req.body, forcedType);

  return res.status(201).json(item);
};

const update = (forcedType) => async (req, res) => {
  const item = await productService.update(req.params.id, req.body, forcedType);

  return res.json(item);
};

const remove = async (req, res) => {
  const resultado = await productService.remove(req.params.id);

  return res.json(resultado);
};

module.exports = {
  list,
  listByType,
  listCardapio,
  getById,
  create,
  update,
  remove,
};
