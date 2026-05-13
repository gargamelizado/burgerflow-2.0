const productRepository = require('./product.repository');

const list = async () => {
  return productRepository.list();
};

const create = async (data) => {
  const produto = {
    nome: data.nome,
    categoria: data.categoria || '',
    tipo: data.tipo || 'simples',
    preco: Number(data.preco || 0),
    custo: Number(data.custo || 0),
    quantidade_estoque: Number(data.quantidade_estoque || 0),
    unidade: data.unidade || 'un',
    ativo: data.ativo !== undefined ? data.ativo : true,
  };

  return productRepository.create(produto);
};

const update = async (id, data) => {
  const produto = {
    nome: data.nome,
    categoria: data.categoria || '',
    tipo: data.tipo || 'simples',
    preco: Number(data.preco || 0),
    custo: Number(data.custo || 0),
    quantidade_estoque: Number(data.quantidade_estoque || 0),
    unidade: data.unidade || 'un',
    ativo: data.ativo !== undefined ? data.ativo : true,
  };

  return productRepository.update(id, produto);
};

const remove = async (id) => {
  return productRepository.remove(id);
};

module.exports = {
  list,
  create,
  update,
  remove,
};