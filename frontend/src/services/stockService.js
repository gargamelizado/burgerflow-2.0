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

export const listarEstoque = async () => {
  const response = await fetch(`${API_URL}/produtos`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};

export const movimentarEstoque = async ({
  produto_id,
  tipo,
  quantidade,
  motivo,
}) => {
  const response = await fetch(`${API_URL}/estoque/movimentar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      produto_id,
      tipo,
      quantidade,
      motivo,
    }),
  });

  return tratarResposta(response);
};

export const listarHistoricoEstoque = async () => {
  const response = await fetch(`${API_URL}/estoque/historico`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};
