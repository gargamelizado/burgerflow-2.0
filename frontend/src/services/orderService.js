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

export const listarPedidos = async () => {
  const response = await fetch(`${API_URL}/pedidos`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};

export const criarPedido = async (pedido) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };

  if (pedido.gerencialToken) {
    headers['x-gerencial-token'] = pedido.gerencialToken;
  }

  const response = await fetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers,
    body: JSON.stringify(pedido),
  });

  return tratarResposta(response);
};

export const atualizarStatusPedido = async (id, status) => {
  const response = await fetch(`${API_URL}/pedidos/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ status }),
  });

  return tratarResposta(response);
};

export const corrigirStatusPedidoGerencial = async (id, status) => {
  const response = await fetch(`${API_URL}/pedidos/${id}/status/gerencial`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ status }),
  });

  return tratarResposta(response);
};
