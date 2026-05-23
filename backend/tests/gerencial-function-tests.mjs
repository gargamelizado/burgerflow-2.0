import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3006/api';

const db = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'burger_flow_2_0',
  waitForConnections: true,
  connectionLimit: 4,
});

const state = {
  startedAt: new Date(),
  adminToken: null,
  manager: null,
  seller: null,
  sellableItemId: null,
};

const results = [];

const toNum = (value) => Number(Number(value || 0).toFixed(2));

async function api(pathname, { method = 'GET', token, body, headers = {} } = {}) {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { raw: await response.text() };
  }
  return { status: response.status, ok: response.ok, data, contentType };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run(id, title, fn) {
  try {
    const details = await fn();
    results.push({ id, title, status: 'PASS', details: details || '' });
  } catch (error) {
    results.push({
      id,
      title,
      status: 'FAIL',
      details: error?.message || String(error),
    });
  }
}

function skip(id, title, reason) {
  results.push({ id, title, status: 'SKIP', details: reason });
}

async function login(email, senha) {
  const res = await api('/auth/login', {
    method: 'POST',
    body: { email, senha },
  });
  assert(res.ok, `Login falhou para ${email}: HTTP ${res.status}`);
  assert(res.data?.token, `Login sem token para ${email}`);
  return res.data;
}

async function ensureNoOpenCash(token) {
  const open = await api('/caixa/aberto', { token });
  assert(open.ok, `Falha em /caixa/aberto: ${open.status}`);
  if (!open.data?.aberto) return;
  const expected = Number(open.data?.resumo?.valor_esperado || 0);
  const valorFinalCleanup = Number.isFinite(expected) ? Math.max(expected, 0) : 0;
  const close = await api('/caixa/fechar', {
    method: 'POST',
    token,
    body: {
      valor_final: valorFinalCleanup,
      observacao: 'Cleanup testes gerenciais',
    },
  });
  assert(
    close.ok,
    `Falha ao fechar caixa no cleanup: ${close.status} - ${close.data?.message || 'sem mensagem'}`
  );
}

async function openCash(
  token,
  valor = 100,
  observacao = 'Abertura teste',
  gerencialToken = null
) {
  const headers = gerencialToken ? { 'x-gerencial-token': gerencialToken } : {};
  return api('/caixa/abrir', {
    method: 'POST',
    token,
    headers,
    body: { valor_inicial: valor, observacao },
  });
}

async function closeCash(token, valorFinal, observacao = '', gerencialToken = null) {
  const headers = gerencialToken ? { 'x-gerencial-token': gerencialToken } : {};
  return api('/caixa/fechar', {
    method: 'POST',
    token,
    headers,
    body: { valor_final: valorFinal, observacao },
  });
}

async function movement(token, tipo, valor, motivo = '', gerencialToken = null) {
  const headers = gerencialToken ? { 'x-gerencial-token': gerencialToken } : {};
  return api('/caixa/movimento', {
    method: 'POST',
    token,
    headers,
    body: { tipo, valor, motivo },
  });
}

async function getOpenCash(token) {
  const res = await api('/caixa/aberto', { token });
  assert(res.ok, `Falha em /caixa/aberto: ${res.status}`);
  return res.data;
}

async function getCardapioItem(token) {
  if (state.sellableItemId) return state.sellableItemId;
  const res = await api('/cardapio', { token });
  assert(res.ok, `Falha em /cardapio: ${res.status}`);
  const item = (res.data || []).find(
    (it) => it.tipo !== 'INGREDIENTE' && Number(it.preco_venda || 0) > 0
  );
  assert(item, 'Nenhum item vendável encontrado em /cardapio');
  state.sellableItemId = Number(item.id);
  return state.sellableItemId;
}

async function createOrder(token, { forma_pagamento = 'dinheiro', quantidade = 1 } = {}) {
  const itemId = await getCardapioItem(token);
  const res = await api('/pedidos', {
    method: 'POST',
    token,
    body: {
      cliente_nome: 'Teste Gerencial',
      tipo: 'balcao',
      forma_pagamento,
      itens: [{ item_id: itemId, quantidade }],
    },
  });
  return res;
}

async function createUserAdmin(token, payload) {
  const res = await api('/usuarios', {
    method: 'POST',
    token,
    body: payload,
  });
  return res;
}

async function authorizeManagerAction(
  requesterToken,
  {
    acao,
    identificador,
    senha,
    motivo = 'Autorização gerencial de teste',
    entidade = 'caixa',
    registro_id = null,
    valor = null,
  }
) {
  const res = await api('/gerencial/autorizar', {
    method: 'POST',
    token: requesterToken,
    body: {
      acao,
      identificador,
      senha,
      motivo,
      entidade,
      registro_id,
      valor,
    },
  });

  return res;
}

async function auditCountByAction(action) {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM auditoria
    WHERE acao = ?
    `,
    [action]
  );
  return Number(rows?.[0]?.total || 0);
}

function firstMissingActions(actions, counts) {
  return actions.filter((action) => (counts[action] || 0) <= 0);
}

await run('SETUP-01', 'Login admin', async () => {
  const admin = await login('admin@estoque.com', 'admin123');
  state.adminToken = admin.token;
  return 'admin autenticado';
});

await run('SETUP-02', 'Criar usuários de teste (gerente e vendedor)', async () => {
  const stamp = Date.now();
  const managerEmail = `manager_test_${stamp}@bf.local`;
  const sellerEmail = `seller_test_${stamp}@bf.local`;

  const managerRes = await createUserAdmin(state.adminToken, {
    nome: 'Manager Teste',
    email: managerEmail,
    senha: 'senha123',
    nivel_acesso: 'gerente',
    ativo: true,
  });
  assert(managerRes.ok, `Falha ao criar gerente: HTTP ${managerRes.status}`);

  const sellerRes = await createUserAdmin(state.adminToken, {
    nome: 'Seller Teste',
    email: sellerEmail,
    senha: 'senha123',
    nivel_acesso: 'vendedor',
    ativo: true,
  });
  assert(sellerRes.ok, `Falha ao criar vendedor: HTTP ${sellerRes.status}`);

  const managerLogin = await login(managerEmail, 'senha123');
  const sellerLogin = await login(sellerEmail, 'senha123');

  state.manager = {
    id: managerRes.data?.usuario?.id,
    token: managerLogin.token,
    email: managerEmail,
  };
  state.seller = {
    id: sellerRes.data?.usuario?.id,
    token: sellerLogin.token,
    email: sellerEmail,
  };

  return `manager#${state.manager.id} e seller#${state.seller.id} criados`;
});

await run('T1', 'Gerente abre caixa com sucesso', async () => {
  await ensureNoOpenCash(state.adminToken);
  const res = await openCash(state.manager.token, 100, 'Abertura teste');
  assert([200, 201].includes(res.status), `HTTP ${res.status}`);
  assert(res.contentType.includes('application/json'), 'Resposta não JSON');
  assert(res.data?.message === 'Caixa aberto com sucesso.', `Mensagem: ${res.data?.message}`);
  assert(res.data?.caixa?.status === 'aberto', 'Caixa não abriu');
  assert(toNum(res.data?.caixa?.valor_inicial) === 100, 'Valor inicial diferente de 100');
  assert(Number(res.data?.caixa?.usuario_id) === Number(state.manager.id), 'Usuário abertura incorreto');
  assert(Boolean(res.data?.caixa?.aberto_em), 'aberto_em não preenchido');
  return 'caixa aberto por gerente';
});

await run('T2', 'Não permitir abrir dois ou mais caixas ao mesmo tempo', async () => {
  const res = await openCash(state.manager.token, 100, 'Tentativa duplicada');
  assert([400, 409].includes(res.status), `HTTP inesperado ${res.status}`);
  assert(String(res.data?.message || '').length > 0, 'Mensagem vazia');
  return `bloqueado com HTTP ${res.status}`;
});

await run('T3', 'Bloquear abertura com valor negativo', async () => {
  await ensureNoOpenCash(state.adminToken);
  const res = await openCash(state.manager.token, -10, 'Valor inválido');
  assert(res.status === 400, `HTTP ${res.status}`);
  assert(String(res.data?.message || '').toLowerCase().includes('negativo'), 'Mensagem inesperada');
  return 'valor negativo bloqueado';
});

await run('T4', 'Vendedor sem permissão tentando abrir caixa (esperado 403)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const res = await openCash(state.seller.token, 100, 'Vendedor tentando abrir');
  assert(res.status === 403, `Esperado 403, veio ${res.status}`);
  return 'bloqueado corretamente';
});

await run('T5', 'Vendedor abre caixa com autorização gerencial', async () => {
  await ensureNoOpenCash(state.adminToken);
  const auth = await authorizeManagerAction(state.seller.token, {
    acao: 'abrir_caixa',
    identificador: state.manager.email,
    senha: 'senha123',
    motivo: 'Autorização para abertura por vendedor',
    valor: 100,
  });
  assert(auth.ok, `Autorização falhou: HTTP ${auth.status}`);
  const tokenGerencial = auth.data?.autorizacao?.token;
  assert(tokenGerencial, 'Token gerencial não retornado');

  const res = await openCash(
    state.seller.token,
    100,
    'Vendedor com autorização',
    tokenGerencial
  );
  assert([200, 201].includes(res.status), `HTTP ${res.status}`);
  return `abriu com token ${tokenGerencial.slice(0, 12)}...`;
});

await run('T6', 'Suprimento com caixa aberto', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T6');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);

  const before = await getOpenCash(state.adminToken);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const res = await movement(state.adminToken, 'suprimento', 50, 'Troco adicional');
  assert([200, 201].includes(res.status), `HTTP ${res.status}`);
  assert(
    String(res.data?.message || '').toLowerCase().includes('suprimento registrado'),
    'Mensagem inesperada'
  );

  const after = await getOpenCash(state.adminToken);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === toNum(expectedBefore + 50), `Esperado ${expectedBefore + 50}, veio ${expectedAfter}`);
  return 'suprimento aumentou valor esperado';
});

await run('T7', 'Suprimento sem motivo (esperado bloquear)', async () => {
  const res = await movement(state.adminToken, 'suprimento', 50, '');
  assert(res.status === 400, `Esperado 400, veio ${res.status}`);
  return 'bloqueado sem motivo';
});

await run('T8', 'Suprimento com valor inválido', async () => {
  const resZero = await movement(state.adminToken, 'suprimento', 0, 'inválido');
  assert(resZero.status === 400, `valor=0 retornou ${resZero.status}`);
  const resNeg = await movement(state.adminToken, 'suprimento', -10, 'inválido');
  assert(resNeg.status === 400, `valor=-10 retornou ${resNeg.status}`);
  return 'valores inválidos bloqueados';
});

await run('T9', 'Suprimento com caixa fechado', async () => {
  await ensureNoOpenCash(state.adminToken);
  const res = await movement(state.adminToken, 'suprimento', 10, 'sem caixa');
  assert([400, 404].includes(res.status), `HTTP ${res.status}`);
  return `bloqueado com HTTP ${res.status}`;
});

await run('T10', 'Sangria com caixa aberto', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 200, 'Abertura T10');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);

  const before = await getOpenCash(state.adminToken);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const res = await movement(state.adminToken, 'sangria', 50, 'Retirada para cofre');
  assert([200, 201].includes(res.status), `HTTP ${res.status}`);

  const after = await getOpenCash(state.adminToken);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === toNum(expectedBefore - 50), `Esperado ${expectedBefore - 50}, veio ${expectedAfter}`);
  return 'sangria diminuiu valor esperado';
});

await run('T11', 'Sangria sem motivo (esperado bloquear)', async () => {
  const res = await movement(state.adminToken, 'sangria', 50, '');
  assert(res.status === 400, `Esperado 400, veio ${res.status}`);
  return 'bloqueado sem motivo';
});

await run('T12', 'Sangria com valor inválido', async () => {
  const resZero = await movement(state.adminToken, 'sangria', 0, 'inválido');
  assert(resZero.status === 400, `valor=0 retornou ${resZero.status}`);
  const resNeg = await movement(state.adminToken, 'sangria', -10, 'inválido');
  assert(resNeg.status === 400, `valor=-10 retornou ${resNeg.status}`);
  return 'valores inválidos bloqueados';
});

await run('T13', 'Sangria acima do valor esperado sem autorização (esperado bloquear)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T13');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const res = await movement(state.seller.token, 'sangria', 150, 'Acima esperado');
  assert([403, 409].includes(res.status), `Esperado 403/409, veio ${res.status}`);
  return 'bloqueado sem autorização';
});

await run('T14', 'Sangria acima do valor esperado com autorização gerencial', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T14');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);

  const auth = await authorizeManagerAction(state.seller.token, {
    acao: 'registrar_sangria',
    identificador: state.manager.email,
    senha: 'senha123',
    motivo: 'Autorização sangria acima do esperado',
    valor: 150,
  });
  assert(auth.ok, `Autorização falhou: HTTP ${auth.status}`);
  const tokenGerencial = auth.data?.autorizacao?.token;
  assert(tokenGerencial, 'Token gerencial não retornado');

  const res = await api('/caixa/movimento', {
    method: 'POST',
    token: state.seller.token,
    headers: { 'x-gerencial-token': tokenGerencial },
    body: { tipo: 'sangria', valor: 150, motivo: 'Retirada excepcional' },
  });
  assert([200, 201].includes(res.status), `Esperado 200/201, veio ${res.status}`);
  return 'sangria autorizada registrada';
});

await run('T15', 'Fechamento sem diferença', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T15');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);

  const vendaDinheiro = await createOrder(state.adminToken, { forma_pagamento: 'dinheiro' });
  assert(vendaDinheiro.ok, `Venda dinheiro falhou: ${vendaDinheiro.status}`);
  const vendaPix = await createOrder(state.adminToken, { forma_pagamento: 'pix' });
  assert(vendaPix.ok, `Venda pix falhou: ${vendaPix.status}`);
  const vendaCartao = await createOrder(state.adminToken, { forma_pagamento: 'cartao_credito' });
  assert(vendaCartao.ok, `Venda cartão falhou: ${vendaCartao.status}`);

  const supr = await movement(state.adminToken, 'suprimento', 50, 'Suprimento T15');
  assert(supr.ok, `Suprimento falhou: ${supr.status}`);
  const sang = await movement(state.adminToken, 'sangria', 10, 'Sangria T15');
  assert(sang.ok, `Sangria falhou: ${sang.status}`);

  const open = await getOpenCash(state.adminToken);
  const expected = toNum(open?.resumo?.valor_esperado);
  const closeRes = await closeCash(state.adminToken, expected, 'Fechamento sem diferença');
  assert(closeRes.ok, `Fechamento falhou: ${closeRes.status}`);
  assert(toNum(closeRes.data?.resumo?.diferenca) === 0, 'Diferença não é zero');
  assert(closeRes.data?.resultado?.tipo === 'conferido', 'Resultado não conferido');
  return `fechou com esperado=${expected}`;
});

await run('T16', 'Fechamento com falta', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 170, 'Abertura T16');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const closeRes = await closeCash(
    state.adminToken,
    160,
    'Falta conferida no fechamento'
  );
  assert(closeRes.ok, `Fechamento falhou: ${closeRes.status}`);
  assert(toNum(closeRes.data?.resumo?.diferenca) === -10, `Diferença veio ${closeRes.data?.resumo?.diferenca}`);
  assert(closeRes.data?.resultado?.tipo === 'faltou', 'Resultado não faltou');
  return 'diferença negativa validada';
});

await run('T17', 'Fechamento com sobra', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 170, 'Abertura T17');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const closeRes = await closeCash(
    state.adminToken,
    180,
    'Sobra conferida no fechamento'
  );
  assert(closeRes.ok, `Fechamento falhou: ${closeRes.status}`);
  assert(toNum(closeRes.data?.resumo?.diferenca) === 10, `Diferença veio ${closeRes.data?.resumo?.diferenca}`);
  assert(closeRes.data?.resultado?.tipo === 'sobrou', 'Resultado não sobrou');
  return 'diferença positiva validada';
});

await run('T18', 'Fechamento com diferença sem observação (esperado bloquear)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 170, 'Abertura T18');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const closeRes = await closeCash(state.adminToken, 160, '');
  assert(closeRes.status === 400, `Esperado 400, veio ${closeRes.status}`);
  return 'bloqueado sem observação';
});

await run('T19', 'Fechamento com valor final inválido', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T19');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const closeInvalidText = await closeCash(state.adminToken, 'abc', 'teste');
  assert(closeInvalidText.status === 400, `valor texto retornou ${closeInvalidText.status}`);
  const closeInvalidNeg = await closeCash(state.adminToken, -1, 'teste');
  assert(closeInvalidNeg.status === 400, `valor -1 retornou ${closeInvalidNeg.status}`);
  return 'valor final inválido bloqueado';
});

await run('T20', 'Fechar caixa sem caixa aberto', async () => {
  await ensureNoOpenCash(state.adminToken);
  const closeRes = await closeCash(state.adminToken, 10, 'sem caixa');
  assert([400, 404].includes(closeRes.status), `HTTP ${closeRes.status}`);
  return `bloqueado com HTTP ${closeRes.status}`;
});

await run('T21', 'Tentar fechar caixa já fechado', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T21');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const close1 = await closeCash(state.adminToken, 100, 'Fechamento T21');
  assert(close1.ok, `Primeiro fechamento falhou: ${close1.status}`);
  const close2 = await closeCash(state.adminToken, 100, 'Fechamento duplicado');
  assert([400, 404, 409].includes(close2.status), `HTTP ${close2.status}`);
  return `segundo fechamento bloqueado com HTTP ${close2.status}`;
});

await run('T22', 'Vendedor fechando caixa sem autorização (esperado 403)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T22');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const closeRes = await closeCash(state.seller.token, 100, 'Vendedor fechando');
  assert(closeRes.status === 403, `Esperado 403, veio ${closeRes.status}`);
  return 'bloqueado corretamente';
});

await run('T23', 'Vendedor fechando caixa com autorização gerencial', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T23');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);

  const auth = await authorizeManagerAction(state.seller.token, {
    acao: 'fechar_caixa',
    identificador: state.manager.email,
    senha: 'senha123',
    motivo: 'Autorização para fechamento',
    valor: 100,
  });
  assert(auth.ok, `Autorização falhou: HTTP ${auth.status}`);
  const tokenGerencial = auth.data?.autorizacao?.token;
  assert(tokenGerencial, 'Token gerencial não retornado');

  const closeRes = await api('/caixa/fechar', {
    method: 'POST',
    token: state.seller.token,
    headers: { 'x-gerencial-token': tokenGerencial },
    body: { valor_final: 100, observacao: 'Fechamento autorizado' },
  });
  assert(closeRes.status === 200, `Esperado 200, veio ${closeRes.status}`);
  return 'fechamento autorizado concluído';
});

await run('T24', 'Venda bloqueada com caixa fechado (MVP usa /api/pedidos)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const sale = await createOrder(state.adminToken, { forma_pagamento: 'dinheiro' });
  assert([400, 403].includes(sale.status), `Esperado 400/403, veio ${sale.status}`);
  return `bloqueou com HTTP ${sale.status}`;
});

await run('T25', 'Venda permitida com caixa aberto (MVP usa /api/pedidos)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T25');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const sale = await createOrder(state.adminToken, { forma_pagamento: 'dinheiro' });
  assert(sale.status === 201, `Esperado 201, veio ${sale.status}`);
  assert(Boolean(sale.data?.pedido?.id), 'Pedido sem id');
  return `pedido ${sale.data?.pedido?.id} criado`;
});

await run('T26', 'Pix não entra no dinheiro físico (esperado)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T26');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const before = await getOpenCash(state.adminToken);
  const beforeExpected = toNum(before?.resumo?.valor_esperado);
  const sale = await createOrder(state.adminToken, { forma_pagamento: 'pix' });
  assert(sale.ok, `Venda pix falhou: ${sale.status}`);
  const after = await getOpenCash(state.adminToken);
  const afterExpected = toNum(after?.resumo?.valor_esperado);
  assert(afterExpected === beforeExpected, `Esperado manter ${beforeExpected}, veio ${afterExpected}`);
  return 'pix não alterou caixa físico';
});

await run('T27', 'Cartão não entra no dinheiro físico (esperado)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T27');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const before = await getOpenCash(state.adminToken);
  const beforeExpected = toNum(before?.resumo?.valor_esperado);
  const sale = await createOrder(state.adminToken, { forma_pagamento: 'cartao_credito' });
  assert(sale.ok, `Venda cartão falhou: ${sale.status}`);
  const after = await getOpenCash(state.adminToken);
  const afterExpected = toNum(after?.resumo?.valor_esperado);
  assert(afterExpected === beforeExpected, `Esperado manter ${beforeExpected}, veio ${afterExpected}`);
  return 'cartão não alterou caixa físico';
});

await run('T28', 'Dinheiro entra no dinheiro físico', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T28');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const before = await getOpenCash(state.adminToken);
  const beforeExpected = toNum(before?.resumo?.valor_esperado);
  const sale = await createOrder(state.adminToken, { forma_pagamento: 'dinheiro' });
  assert(sale.ok, `Venda dinheiro falhou: ${sale.status}`);
  const after = await getOpenCash(state.adminToken);
  const afterExpected = toNum(after?.resumo?.valor_esperado);
  assert(afterExpected > beforeExpected, `Esperado aumento > ${beforeExpected}, veio ${afterExpected}`);
  return `aumentou de ${beforeExpected} para ${afterExpected}`;
});

await run('T29', 'Pagamento misto só soma dinheiro físico (esperado)', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T29');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  const before = await getOpenCash(state.adminToken);
  const beforeExpected = toNum(before?.resumo?.valor_esperado);

  const saleDinheiro = await createOrder(state.adminToken, { forma_pagamento: 'dinheiro' });
  assert(saleDinheiro.ok, `Venda dinheiro falhou: ${saleDinheiro.status}`);
  const afterDinheiro = await getOpenCash(state.adminToken);
  const expectedAfterMoney = toNum(afterDinheiro?.resumo?.valor_esperado);

  const salePix = await createOrder(state.adminToken, { forma_pagamento: 'pix' });
  assert(salePix.ok, `Venda pix falhou: ${salePix.status}`);
  const afterPix = await getOpenCash(state.adminToken);
  const expectedAfterMixed = toNum(afterPix?.resumo?.valor_esperado);

  assert(
    expectedAfterMixed === expectedAfterMoney,
    `Esperado permanecer ${expectedAfterMoney} após pix, veio ${expectedAfterMixed} (base ${beforeExpected})`
  );
  return 'misto respeitou somente dinheiro';
});

await run('T30', 'Auditoria das ações gerenciais', async () => {
  const requiredActions = [
    'caixa.aberto',
    'caixa.fechado',
    'caixa.suprimento',
    'caixa.sangria',
    'caixa.autorizacao_gerencial',
    'caixa.fechamento_com_diferenca',
  ];
  const counts = {};
  for (const action of requiredActions) {
    counts[action] = await auditCountByAction(action);
  }
  const missing = firstMissingActions(requiredActions, counts);
  assert(missing.length === 0, `Sem auditoria para: ${missing.join(', ')}`);
  return JSON.stringify(counts);
});

await run('T41', 'Regressão fluxo principal /api/pedidos', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Regressão T41');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);

  const sale = await createOrder(state.adminToken, { forma_pagamento: 'dinheiro' });
  assert(sale.status === 201, `Venda não criada: ${sale.status}`);
  const orderId = sale.data?.pedido?.id;
  assert(orderId, 'Pedido sem id');

  const kitchen = await api('/cozinha/pedidos', { token: state.adminToken });
  assert(kitchen.ok, `Cozinha falhou: ${kitchen.status}`);
  const existsKitchen = (kitchen.data || []).some((p) => Number(p.id) === Number(orderId));
  assert(existsKitchen, 'Pedido não apareceu na cozinha');

  const movements = await api('/caixa/movimentos', { token: state.adminToken });
  assert(movements.ok, `Movimentos falhou: ${movements.status}`);
  const venda = (movements.data?.movimentos || []).find(
    (m) => Number(m.pedido_id) === Number(orderId) && m.tipo === 'venda'
  );
  assert(venda, 'Movimento de venda não encontrado');

  return `pedido ${orderId} em cozinha e movimento venda ok`;
});

await run('T42', 'Erros retornam JSON', async () => {
  const noToken = await api('/caixa/aberto');
  assert(noToken.status === 401, `Sem token deveria 401, veio ${noToken.status}`);
  assert(noToken.contentType.includes('application/json'), 'Sem token retornou não-JSON');

  const badToken = await api('/caixa/aberto', {
    token: 'token.invalido.123',
  });
  assert(badToken.status === 401, `Token inválido deveria 401, veio ${badToken.status}`);
  assert(badToken.contentType.includes('application/json'), 'Token inválido retornou não-JSON');

  const invalidMoney = await closeCash(state.adminToken, 'abc', 'erro json');
  assert([400, 404].includes(invalidMoney.status), `Esperado 400/404, veio ${invalidMoney.status}`);
  assert(String(invalidMoney.contentType).includes('application/json'), 'Erro inválido não retornou JSON');
  return 'erros em JSON verificados';
});

await run('T44', 'Cálculo oficial no backend', async () => {
  await ensureNoOpenCash(state.adminToken);
  const openRes = await openCash(state.adminToken, 100, 'Abertura T44');
  assert(openRes.ok, `Não abriu caixa: ${openRes.status}`);
  await movement(state.adminToken, 'suprimento', 50, 'Suprimento T44');
  await movement(state.adminToken, 'sangria', 10, 'Sangria T44');
  const open = await getOpenCash(state.adminToken);
  const expected = toNum(open?.resumo?.valor_esperado);
  const fakeFrontValue = expected + 777;
  const closeRes = await closeCash(state.adminToken, fakeFrontValue, 'Teste recálculo backend');
  assert(closeRes.ok, `Fechamento falhou: ${closeRes.status}`);
  const diff = toNum(closeRes.data?.resumo?.diferenca);
  assert(diff === 777, `Backend não recalculou corretamente, diferença ${diff}`);
  return 'backend recalculou valor esperado e diferença';
});

await run('CLEANUP', 'Fechar caixa aberto e desativar usuários de teste', async () => {
  await ensureNoOpenCash(state.adminToken);
  if (state.manager?.id) {
    await api(`/usuarios/${state.manager.id}`, {
      method: 'DELETE',
      token: state.adminToken,
    });
  }
  if (state.seller?.id) {
    await api(`/usuarios/${state.seller.id}`, {
      method: 'DELETE',
      token: state.adminToken,
    });
  }
  return 'cleanup concluído';
});

const summary = results.reduce(
  (acc, item) => {
    acc.total += 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  },
  { total: 0, PASS: 0, FAIL: 0, SKIP: 0 }
);

const report = {
  generated_at: new Date().toISOString(),
  base_url: BASE_URL,
  summary,
  results,
};

const reportDir = path.resolve(__dirname, '../test-results');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}
const reportPath = path.join(reportDir, 'gerencial-function-report.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(report, null, 2));

await db.end();
