const authService = require('./auth.service');

const login = async (req, res) => {
  const result = await authService.login(req.body);

  return res.json(result);
};

const verify = async (req, res) => {
  return res.json({
    valid: true,
    usuario: req.user,
  });
};

module.exports = {
  login,
  verify,
};