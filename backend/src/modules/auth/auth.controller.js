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

const alterarSenha = async (req, res) => {
  const result = await authService.alterarSenha({
    usuario_id: req.user?.id,
    senha_atual: req.body?.senha_atual,
    nova_senha: req.body?.nova_senha,
  });

  return res.json(result);
};

module.exports = {
  login,
  verify,
  alterarSenha,
};
