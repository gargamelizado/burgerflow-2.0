import { API_URL, getToken, fetchJson } from '../config/api';

const buildHeaders = (gerencialToken = null) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };

  if (gerencialToken) {
    headers['x-gerencial-token'] = gerencialToken;
  }

  return headers;
};

export const buscarCaixaAberto = async () => {
  return fetchJson(`${API_URL}/caixa/aberto`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

export const abrirCaixa = async ({
  numero,
  operador_id,
  valor_inicial,
  observacao,
  gerencial_token = null,
  motivo_autorizacao = '',
}) => {
  const payload = {
    numero,
    operador_id,
    valor_inicial,
    observacao,
    motivo_autorizacao,
  };

  return fetchJson(`${API_URL}/caixas/abrir`, {
    method: 'POST',
    headers: buildHeaders(gerencial_token),
    body: JSON.stringify(payload),
  });
};

export const fecharCaixa = async ({
  caixa_id,
  valor_final,
  observacao,
  gerencial_token = null,
  motivo_autorizacao = '',
}) => {
  const endpoint = caixa_id
    ? `${API_URL}/caixas/${caixa_id}/fechar`
    : `${API_URL}/caixa/fechar`;

  return fetchJson(endpoint, {
    method: 'POST',
    headers: buildHeaders(gerencial_token),
    body: JSON.stringify({
      valor_final,
      observacao,
      motivo_autorizacao,
    }),
  });
};

export const registrarMovimentoCaixa = async ({
  caixa_id,
  tipo,
  valor,
  motivo,
  gerencial_token = null,
  motivo_autorizacao = '',
}) => {
  return fetchJson(`${API_URL}/caixa/movimento`, {
    method: 'POST',
    headers: buildHeaders(gerencial_token),
    body: JSON.stringify({
      caixa_id,
      tipo,
      valor,
      motivo,
      motivo_autorizacao,
    }),
  });
};

export const listarMovimentosCaixa = async (caixa_id = null) => {
  const query = caixa_id ? `?caixa_id=${encodeURIComponent(caixa_id)}` : '';
  return fetchJson(`${API_URL}/caixa/movimentos${query}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

export const listarCaixasAbertos = async () => {
  return fetchJson(`${API_URL}/caixas/abertos`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

export const buscarCaixaPorId = async (caixaId) => {
  return fetchJson(`${API_URL}/caixas/${caixaId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

export const listarVendasPorCaixa = async (caixaId) => {
  return fetchJson(`${API_URL}/caixas/${caixaId}/vendas`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
};

export const abrirCaixasTeste = async (quantidade) => {
  return fetchJson(`${API_URL}/teste/abrir-caixas`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      quantidade,
    }),
  });
};

export const venderEmCaixasTeste = async (vendas) => {
  return fetchJson(`${API_URL}/teste/vender-em-caixas`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      vendas,
    }),
  });
};

export const autorizarAcaoGerencial = async ({
  acao,
  identificador,
  senha,
  motivo,
  entidade = 'caixa',
  registro_id = null,
  valor = null,
}) => {
  return fetchJson(`${API_URL}/gerencial/autorizar`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      acao,
      identificador,
      senha,
      motivo,
      entidade,
      registro_id,
      valor,
    }),
  });
};
