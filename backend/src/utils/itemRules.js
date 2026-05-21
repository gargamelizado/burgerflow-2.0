const TIPOS_ITEM = ['INGREDIENTE', 'PRODUTO', 'COMBO', 'PROMOCAO'];

const CATEGORIAS = [
  'hambúrguer',
  'vegano',
  'acompanhamento',
  'sobremesa',
  'fritas',
  'bebida',
  'combo',
  'promoção',
  'ingrediente',
];

const UNIDADES_MEDIDA = ['gr', 'kg', 'ml', 'li'];
const UNIDADES_BASE = ['gr', 'ml'];
const TIPOS_ENTRADA = ['cx', 'pacote', 'medida'];

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizarTipo = (tipo) => {
  return String(tipo || '').trim().toUpperCase();
};

const validarTipoItem = (tipo) => {
  const tipoNormalizado = normalizarTipo(tipo);

  if (!TIPOS_ITEM.includes(tipoNormalizado)) {
    const error = new Error(
      'Tipo de item inválido. Use INGREDIENTE, PRODUTO, COMBO ou PROMOCAO.'
    );
    error.statusCode = 400;
    throw error;
  }

  return tipoNormalizado;
};

const validarCategoria = (categoria) => {
  const categoriaNormalizada = String(categoria || '').trim().toLowerCase();

  if (categoriaNormalizada === 'todos') {
    const error = new Error('A categoria "todos" existe apenas como filtro.');
    error.statusCode = 400;
    throw error;
  }

  if (!CATEGORIAS.includes(categoriaNormalizada)) {
    const error = new Error('Categoria inválida para item do cardápio.');
    error.statusCode = 400;
    throw error;
  }

  return categoriaNormalizada;
};

const converterParaBase = (quantidade, unidade) => {
  const quantidadeNumber = toNumber(quantidade);
  const unidadeNormalizada = String(unidade || '').trim().toLowerCase();

  if (!UNIDADES_MEDIDA.includes(unidadeNormalizada)) {
    const error = new Error('Unidade inválida. Use gr, kg, ml ou li.');
    error.statusCode = 400;
    throw error;
  }

  if (quantidadeNumber <= 0) {
    const error = new Error('Quantidade deve ser maior que zero.');
    error.statusCode = 400;
    throw error;
  }

  if (unidadeNormalizada === 'kg') {
    return {
      quantidade_base: quantidadeNumber * 1000,
      unidade_base: 'gr',
    };
  }

  if (unidadeNormalizada === 'gr') {
    return {
      quantidade_base: quantidadeNumber,
      unidade_base: 'gr',
    };
  }

  if (unidadeNormalizada === 'li') {
    return {
      quantidade_base: quantidadeNumber * 1000,
      unidade_base: 'ml',
    };
  }

  return {
    quantidade_base: quantidadeNumber,
    unidade_base: 'ml',
  };
};

const calcularEstoqueBase = (dadosIngrediente) => {
  const tipoEntrada = String(dadosIngrediente.tipo_entrada || '').trim();
  const quantidadeEntrada = toNumber(dadosIngrediente.quantidade_entrada);
  const pacotesPorCaixa = toNumber(dadosIngrediente.pacotes_por_caixa);
  const quantidadePorPacote = toNumber(dadosIngrediente.quantidade_por_pacote);

  if (!TIPOS_ENTRADA.includes(tipoEntrada)) {
    const error = new Error('Tipo de entrada inválido. Use cx, pacote ou medida.');
    error.statusCode = 400;
    throw error;
  }

  let quantidadeTotal = quantidadeEntrada;

  if (tipoEntrada === 'cx') {
    if (pacotesPorCaixa <= 0 || quantidadePorPacote <= 0) {
      const error = new Error(
        'Cadastro por caixa exige pacotes_por_caixa e quantidade_por_pacote.'
      );
      error.statusCode = 400;
      throw error;
    }

    quantidadeTotal = quantidadeEntrada * pacotesPorCaixa * quantidadePorPacote;
  }

  if (tipoEntrada === 'pacote') {
    if (quantidadePorPacote <= 0) {
      const error = new Error(
        'Cadastro por pacote exige quantidade_por_pacote.'
      );
      error.statusCode = 400;
      throw error;
    }

    quantidadeTotal = quantidadeEntrada * quantidadePorPacote;
  }

  const convertido = converterParaBase(
    quantidadeTotal,
    dadosIngrediente.unidade_medida
  );

  return {
    quantidade_total_base: convertido.quantidade_base,
    unidade_base: convertido.unidade_base,
  };
};

module.exports = {
  TIPOS_ITEM,
  CATEGORIAS,
  UNIDADES_MEDIDA,
  UNIDADES_BASE,
  TIPOS_ENTRADA,
  toNumber,
  validarTipoItem,
  validarCategoria,
  converterParaBase,
  calcularEstoqueBase,
};
