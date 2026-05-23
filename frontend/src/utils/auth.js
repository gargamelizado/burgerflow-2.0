export const obterUsuarioLogado = () => {
  const raw = localStorage.getItem('usuario');

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const usuarioPodeAcessarGerencial = (usuario) => {
  return ['admin', 'gerente'].includes(
    String(usuario?.nivel_acesso || '').toLowerCase()
  );
};
