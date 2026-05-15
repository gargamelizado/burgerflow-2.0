const API_URL = 'http://localhost:3006/api';

const getToken = () => {
  return localStorage.getItem('token');
};

const tratarResposta = async (response) => {
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Resposta não JSON recebida:', text);
    throw new Error('A API retornou HTML em vez de JSON.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição.');
  }

  return data;
};

export const buscarCaixaAberto = async () => {
  const response = await fetch(`${API_URL}/caixa/aberto`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};

export const abrirCaixa = async ({ valor_inicial, observacao }) => {
  const response = await fetch(`${API_URL}/caixa/abrir`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      valor_inicial,
      observacao,
    }),
  });

  return tratarResposta(response);
};

export const fecharCaixa = async ({ valor_final, observacao }) => {
  const response = await fetch(`${API_URL}/caixa/fechar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      valor_final,
      observacao,
    }),
  });

  return tratarResposta(response);
};
export const registrarMovimentoCaixa = async ({ tipo, valor, motivo }) => {
  const response = await fetch(`${API_URL}/caixa/movimento`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      tipo,
      valor,
      motivo,
    }),
  });

  return tratarResposta(response);
};

export const listarMovimentosCaixa = async () => {
  const response = await fetch(`${API_URL}/caixa/movimentos`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};