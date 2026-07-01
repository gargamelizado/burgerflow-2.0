export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3006/api';

export const getToken = () => localStorage.getItem('token');

export const tratarResposta = async (response) => {
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

export const fetchJson = async (url, options) => {
  try {
    const response = await fetch(url, options);
    return await tratarResposta(response);
  } catch (error) {
    console.error('Erro de rede ao acessar a API:', error);
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique se a API está rodando e se o endereço está correto.',
      { cause: error }
    );
  }
};
