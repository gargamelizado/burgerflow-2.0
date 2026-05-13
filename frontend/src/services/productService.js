const API_URL = 'http://localhost:3006/api';

const getToken = () => {
  return localStorage.getItem('token');
};

const tratarResposta = async (response) => {
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();

    console.error('Resposta não JSON recebida:', text);

    throw new Error(
      'A API retornou HTML em vez de JSON. Verifique se o backend está rodando na porta 3006.'
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição.');
  }

  return data;
};

export const listarProdutos = async () => {
  const response = await fetch(`${API_URL}/produtos`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};

export const cadastrarProduto = async (produto) => {
  const response = await fetch(`${API_URL}/produtos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(produto),
  });

  return tratarResposta(response);
};

export const editarProduto = async (id, produto) => {
  const response = await fetch(`${API_URL}/produtos/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(produto),
  });

  return tratarResposta(response);
};

export const deletarProduto = async (id) => {
  const response = await fetch(`${API_URL}/produtos/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};
