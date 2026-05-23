const userService = require('./user.service');

const list = async (req, res) => {
  const usuarios = await userService.list();
  return res.json(usuarios);
};

const create = async (req, res) => {
  const result = await userService.create({
    actorUserId: req.user?.id,
    ...req.body,
  });

  return res.status(201).json(result);
};

const update = async (req, res) => {
  const result = await userService.update(req.params.id, {
    actorUserId: req.user?.id,
    ...req.body,
  });

  return res.json(result);
};

const setPassword = async (req, res) => {
  const result = await userService.setPassword(req.params.id, {
    actorUserId: req.user?.id,
    actorUserLevel: req.user?.nivel_acesso,
    senha: req.body?.senha,
  });

  return res.json(result);
};

const deactivate = async (req, res) => {
  const result = await userService.deactivate(req.params.id, {
    actorUserId: req.user?.id,
  });

  return res.json(result);
};

module.exports = {
  list,
  create,
  update,
  setPassword,
  deactivate,
};
