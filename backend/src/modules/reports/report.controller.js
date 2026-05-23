const reportService = require('./report.service');

const getProductsSold = async (req, res) => {
  const result = await reportService.getProductsSold({
    data_inicio: req.query?.data_inicio,
    data_fim: req.query?.data_fim,
  });

  return res.json(result);
};

module.exports = {
  getProductsSold,
};
