const productService = require('./product.service');

const list = async (req, res) => {
  const produtos = await productService.list();
  return res.json(produtos);
};

const create = async (req, res) => {
  const produto = await productService.create(req.body);
  return res.status(201).json(produto);
};

const update = async (req, res) => {
  const { id } = req.params;

  const produto = await productService.update(id, req.body);

  return res.json(produto);
};

const remove = async (req, res) => {
  const { id } = req.params;

  await productService.remove(id);

  return res.json({
    message: 'Produto deletado com sucesso.',
  });
};

module.exports = {
  list,
  create,
  update,
  remove,
};