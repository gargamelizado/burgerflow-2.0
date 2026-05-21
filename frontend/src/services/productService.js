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

const authHeaders = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export const listarItens = async () => {
  const response = await fetch(`${API_URL}/itens`, {
    headers: authHeaders(),
  });

  return tratarResposta(response);
};

export const listarCardapio = async ({ categoria = 'todos', tipo = '' } = {}) => {
  const params = new URLSearchParams();

  if (categoria) {
    params.set('categoria', categoria);
  }

  if (tipo) {
    params.set('tipo', tipo);
  }

  const response = await fetch(`${API_URL}/cardapio?${params.toString()}`, {
    headers: authHeaders(),
  });

  return tratarResposta(response);
};

export const buscarItem = async (id) => {
  const response = await fetch(`${API_URL}/itens/${id}`, {
    headers: authHeaders(),
  });

  return tratarResposta(response);
};

export const cadastrarItem = async (item) => {
  const response = await fetch(`${API_URL}/itens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(item),
  });

  return tratarResposta(response);
};

export const editarItem = async (id, item) => {
  const response = await fetch(`${API_URL}/itens/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(item),
  });

  return tratarResposta(response);
};

export const desativarItem = async (id) => {
  const response = await fetch(`${API_URL}/itens/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  return tratarResposta(response);
};

export const listarProdutos = listarItens;
export const cadastrarProduto = cadastrarItem;
export const editarProduto = editarItem;
export const deletarProduto = desativarItem;
