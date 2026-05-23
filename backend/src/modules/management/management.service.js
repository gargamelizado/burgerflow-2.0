const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const env = require('../../config/env');
const auditRepository = require('../../repositories/audit.repository');
const managementRepository = require('./management.repository');
const {
  gerencialActions,
  MANAGEMENT_OVERRIDE_TTL_MINUTES,
} = require('../../config/businessRules');

const MANAGEMENT_TOKEN_TYPE = 'gerencial_override';

const normalizeAction = (action) => String(action || '').trim().toLowerCase();

const validateAction = (action) => {
  const normalizedAction = normalizeAction(action);

  if (!gerencialActions.includes(normalizedAction)) {
    const error = new Error('Ação gerencial inválida.');
    error.statusCode = 400;
    throw error;
  }

  return normalizedAction;
};

const authorize = async ({
  solicitante_id,
  solicitante_nivel_acesso,
  identificador,
  senha,
  acao,
  motivo,
  entidade,
  registro_id,
  valor,
}) => {
  const requesterId = Number(solicitante_id);

  if (!Number.isInteger(requesterId) || requesterId <= 0) {
    const error = new Error('Usuário autenticado é obrigatório.');
    error.statusCode = 401;
    throw error;
  }

  const requestedAction = validateAction(acao);
  const managerIdentifier = String(identificador || '').trim();
  const managerPassword = String(senha || '');
  const reason = String(motivo || '').trim();

  if (!managerIdentifier || !managerPassword) {
    const error = new Error('Informe credenciais gerenciais válidas.');
    error.statusCode = 400;
    throw error;
  }

  const manager = await managementRepository.findManagerByIdentifier(
    managerIdentifier
  );

  if (!manager) {
    const error = new Error('Gerente ou administrador não encontrado.');
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    managerPassword,
    manager.senha_hash
  );

  if (!passwordMatches) {
    const error = new Error('Senha gerencial inválida.');
    error.statusCode = 401;
    throw error;
  }

  if (!manager.ativo) {
    const error = new Error('Gerente ou administrador inativo.');
    error.statusCode = 403;
    throw error;
  }

  const expiresIn = `${MANAGEMENT_OVERRIDE_TTL_MINUTES}m`;
  const token = jwt.sign(
    {
      type: MANAGEMENT_TOKEN_TYPE,
      action: requestedAction,
      requester_user_id: requesterId,
      manager_user_id: manager.id,
      requester_role: solicitante_nivel_acesso,
      reason: reason || null,
    },
    env.jwt.secret,
    { expiresIn }
  );

  await auditRepository.logAudit({
    usuario_id: requesterId,
    acao: 'caixa.autorizacao_gerencial',
    entidade: entidade || 'caixa',
    entidade_id: registro_id || null,
    detalhes: {
      acao_autorizada: requestedAction,
      solicitante_id: requesterId,
      solicitante_nivel: solicitante_nivel_acesso || null,
      gerente_autorizador_id: manager.id,
      gerente_autorizador_nivel: manager.nivel_acesso,
      motivo: reason || null,
      valor: valor ?? null,
    },
  });

  return {
    message: 'Autorização gerencial concedida.',
    autorizacao: {
      token,
      acao: requestedAction,
      validade_minutos: MANAGEMENT_OVERRIDE_TTL_MINUTES,
      gerente: {
        id: manager.id,
        nome: manager.nome,
        email: manager.email,
        nivel_acesso: manager.nivel_acesso,
      },
    },
  };
};

const validateAuthorizationToken = async ({
  token,
  requesterUserId,
  action,
}) => {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    const error = new Error('Autorização gerencial é obrigatória para esta ação.');
    error.statusCode = 403;
    throw error;
  }

  let payload;
  try {
    payload = jwt.verify(rawToken, env.jwt.secret);
  } catch (tokenError) {
    const error = new Error('Autorização gerencial inválida ou expirada.');
    error.statusCode = 403;
    throw error;
  }

  if (payload?.type !== MANAGEMENT_TOKEN_TYPE) {
    const error = new Error('Token gerencial inválido.');
    error.statusCode = 403;
    throw error;
  }

  const normalizedAction = validateAction(action);

  if (payload.action !== normalizedAction) {
    const error = new Error('Token gerencial não autorizado para esta ação.');
    error.statusCode = 403;
    throw error;
  }

  if (Number(payload.requester_user_id) !== Number(requesterUserId)) {
    const error = new Error(
      'Token gerencial não pertence ao usuário autenticado.'
    );
    error.statusCode = 403;
    throw error;
  }

  const manager = await managementRepository.findManagerById(
    payload.manager_user_id
  );

  if (!manager) {
    const error = new Error('Gerente autorizador não encontrado ou inativo.');
    error.statusCode = 403;
    throw error;
  }

  return {
    managerUserId: manager.id,
    managerLevel: manager.nivel_acesso,
    reason: payload.reason || null,
    action: payload.action,
  };
};

module.exports = {
  authorize,
  validateAuthorizationToken,
};

