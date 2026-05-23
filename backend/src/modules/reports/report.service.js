const reportRepository = require('./report.repository');

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const getProductsSold = async ({ data_inicio, data_fim }) => {
  if (!data_inicio || !data_fim) {
    const error = new Error('Data inicial e data final são obrigatórias.');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidDate(data_inicio) || !isValidDate(data_fim)) {
    const error = new Error('Datas devem estar no formato YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  if (data_inicio > data_fim) {
    const error = new Error('Data inicial não pode ser maior que data final.');
    error.statusCode = 400;
    throw error;
  }

  const itens = await reportRepository.getProductsSold({
    data_inicio,
    data_fim,
  });

  const resumo = itens.reduce(
    (acc, item) => {
      acc.quantidade_total_itens += Number(item.quantidade_vendida || 0);
      acc.valor_total_vendido += Number(item.total_vendido || 0);
      return acc;
    },
    {
      quantidade_total_itens: 0,
      valor_total_vendido: 0,
    }
  );

  return {
    periodo: {
      data_inicio,
      data_fim,
    },
    itens,
    resumo: {
      quantidade_total_itens: Number(resumo.quantidade_total_itens.toFixed(3)),
      valor_total_vendido: Number(resumo.valor_total_vendido.toFixed(2)),
    },
  };
};

module.exports = {
  getProductsSold,
};
