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

export const buscarRelatorioProdutosVendidos = async ({
  data_inicio,
  data_fim,
}) => {
  const params = new URLSearchParams({
    data_inicio,
    data_fim,
  });

  const response = await fetch(
    `${API_URL}/gerencial/relatorios/produtos-vendidos?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  return tratarResposta(response);
};
