const db = require('../../config/db');
const inventoryRepository = require('./inventory.repository');
const { converterParaBase, toNumber } = require('../../utils/itemRules');

const list = async () => {
  return inventoryRepository.listIngredientsStock();
};

const movimentar = async (data) => {
  const ingredienteId = Number(data.ingrediente_id || data.produto_id);
  const quantidade = toNumber(data.quantidade);
  const tipo = data.tipo;
  const motivo = data.motivo || '';
  const unidade = data.unidade || data.unidade_base;

  if (!ingredienteId) {
    const error = new Error('Ingrediente é obrigatório.');
    error.statusCode = 400;
    throw error;
  }

  if (!['entrada', 'saida', 'ajuste'].includes(tipo)) {
    const error = new Error('Tipo de movimentação inválido.');
    error.statusCode = 400;
    throw error;
  }

  const convertido = converterParaBase(quantidade, unidade);
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const estoque = await inventoryRepository.findIngredientStock(
      ingredienteId,
      connection
    );

    if (!estoque || estoque.tipo !== 'INGREDIENTE') {
      const error = new Error('Ingrediente não encontrado no estoque.');
      error.statusCode = 404;
      throw error;
    }

    if (estoque.unidade_base !== convertido.unidade_base) {
      const error = new Error(
        `Unidade incompatível para ${estoque.nome}. Use ${estoque.unidade_base}.`
      );
      error.statusCode = 400;
      throw error;
    }

    const quantidadeAnterior = toNumber(estoque.quantidade_total_base);
    let quantidadeNova = quantidadeAnterior;

    if (tipo === 'entrada') {
      quantidadeNova = quantidadeAnterior + convertido.quantidade_base;
    }

    if (tipo === 'saida') {
      quantidadeNova = quantidadeAnterior - convertido.quantidade_base;
    }

    if (tipo === 'ajuste') {
      quantidadeNova = convertido.quantidade_base;
    }

    await inventoryRepository.updateIngredientStock(
      ingredienteId,
      quantidadeNova,
      connection
    );

    await inventoryRepository.createMovement(
      {
        ingrediente_id: ingredienteId,
        tipo,
        quantidade: convertido.quantidade_base,
        unidade_base: convertido.unidade_base,
        quantidade_anterior: quantidadeAnterior,
        quantidade_nova: quantidadeNova,
        motivo,
      },
      connection
    );

    await connection.commit();

    return {
      message: 'Movimentação registrada com sucesso.',
      ingrediente_id: ingredienteId,
      quantidade_anterior: quantidadeAnterior,
      quantidade_nova: quantidadeNova,
      unidade_base: convertido.unidade_base,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const historico = async () => {
  return inventoryRepository.listMovements();
};

module.exports = {
  list,
  movimentar,
  historico,
};
