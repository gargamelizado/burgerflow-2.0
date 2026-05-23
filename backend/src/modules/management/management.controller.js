const managementService = require('./management.service');

const getUserId = (req) => req.user?.id || req.usuario?.id || req.userId || null;
const getUserLevel = (req) => req.user?.nivel_acesso || req.usuario?.nivel_acesso || null;

const authorize = async (req, res) => {
  const result = await managementService.authorize({
    solicitante_id: getUserId(req),
    solicitante_nivel_acesso: getUserLevel(req),
    identificador: req.body?.identificador || req.body?.email_ou_usuario,
    senha: req.body?.senha,
    acao: req.body?.acao,
    motivo: req.body?.motivo,
    entidade: req.body?.entidade,
    registro_id: req.body?.registro_id,
    valor: req.body?.valor,
  });

  return res.json(result);
};

module.exports = {
  authorize,
};

