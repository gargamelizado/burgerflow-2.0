const API_URL = 'http://localhost:3006/api';

const getToken = () => localStorage.getItem('token');

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

export const listarUsuarios = async () => {
  const response = await fetch(`${API_URL}/usuarios`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};

export const criarUsuario = async (payload) => {
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  return tratarResposta(response);
};

export const atualizarUsuario = async (id, payload) => {
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(payload),
  });

  return tratarResposta(response);
};

export const alterarSenhaUsuario = async (id, senha) => {
  const response = await fetch(`${API_URL}/usuarios/${id}/senha`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ senha }),
  });

  return tratarResposta(response);
};

export const desativarUsuario = async (id) => {
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  return tratarResposta(response);
};
