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
  connectionLimit: 6,
});

const state = {
  startedAt: new Date().toISOString(),
  admin: null,
  manager: null,
  seller: null,
  ingredientId: null,
  productId: null,
  cash: {
    one: null,
    two: null,
    three: null,
    four: null,
    sellerFive: null,
  },
  orders: {},
};

const results = [];

const toNum = (value) => Number(Number(value || 0).toFixed(2));

async function api(pathname, { method = 'GET', token, body, headers = {} } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { raw: await response.text() };

  return {
    status: response.status,
    ok: response.ok,
    contentType,
    data,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function login(email, senha) {
  const res = await api('/auth/login', {
    method: 'POST',
    body: { email, senha },
  });
  assert(res.ok, `Login falhou para ${email}: HTTP ${res.status}`);
  assert(res.data?.token, `Login sem token para ${email}`);
  return res.data;
}

async function createUserByAdmin(token, payload) {
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
    motivo = 'Autorizacao gerencial de teste',
    entidade = 'caixa',
    registro_id = null,
    valor = null,
  }
) {
  return api('/gerencial/autorizar', {
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
}

async function listOpenCashes(token) {
  const res = await api('/caixas/abertos', { token });
  assert(res.ok, `Falha ao listar caixas abertos: HTTP ${res.status}`);
  return res.data?.caixas || [];
}

async function getCashById(token, cashId) {
  const res = await api(`/caixas/${cashId}`, { token });
  assert(res.ok, `Falha ao buscar caixa ${cashId}: HTTP ${res.status}`);
  return res.data?.caixa;
}

async function closeCashById({
  token,
  cashId,
  valorFinal,
  observacao,
  gerencialToken = null,
}) {
  const headers = gerencialToken
    ? { 'x-gerencial-token': gerencialToken }
    : {};
  return api(`/caixas/${cashId}/fechar`, {
    method: 'POST',
    token,
    headers,
    body: {
      valor_final: valorFinal,
      observacao,
    },
  });
}

async function openCash({
  token,
  numero,
  operadorId,
  valorInicial = 100,
  observacao = 'Abertura teste',
  gerencialToken = null,
}) {
  const headers = gerencialToken
    ? { 'x-gerencial-token': gerencialToken }
    : {};
  return api('/caixas/abrir', {
    method: 'POST',
    token,
    headers,
    body: {
      numero,
      operador_id: operadorId,
      valor_inicial: valorInicial,
      observacao,
    },
  });
}

async function createMovement({
  token,
  cashId,
  tipo,
  valor,
  motivo,
  gerencialToken = null,
}) {
  const headers = gerencialToken
    ? { 'x-gerencial-token': gerencialToken }
    : {};
  return api('/caixa/movimento', {
    method: 'POST',
    token,
    headers,
    body: {
      caixa_id: cashId,
      tipo,
      valor,
      motivo,
    },
  });
}

async function createOrder({
  token,
  cashId,
  itemId,
  quantidade = 1,
  formaPagamento = 'dinheiro',
  clienteNome = 'Teste Gerencial',
}) {
  return api('/pedidos', {
    method: 'POST',
    token,
    body: {
      caixa_id: cashId,
      cliente_nome: clienteNome,
      tipo: 'balcao',
      forma_pagamento: formaPagamento,
      status_pagamento: 'pago',
      itens: [
        {
          item_id: itemId,
          quantidade,
        },
      ],
    },
  });
}

async function listCashSales(token, cashId) {
  const res = await api(`/caixas/${cashId}/vendas`, { token });
  assert(res.ok, `Falha ao listar vendas do caixa ${cashId}: HTTP ${res.status}`);
  return res.data?.vendas || [];
}

async function getKitchenOrders(token) {
  const res = await api('/cozinha/pedidos', { token });
  assert(res.ok, `Falha ao listar cozinha: HTTP ${res.status}`);
  return res.data || [];
}

async function getOrders(token) {
  const res = await api('/pedidos', { token });
  assert(res.ok, `Falha ao listar pedidos: HTTP ${res.status}`);
  return res.data || [];
}

async function getCashMovements(token, cashId) {
  const res = await api(`/caixa/movimentos?caixa_id=${cashId}`, { token });
  assert(res.ok, `Falha ao listar movimentos caixa ${cashId}: HTTP ${res.status}`);
  return res.data?.movimentos || [];
}

async function getIngredientStock(ingredientId) {
  const [rows] = await db.query(
    `
    SELECT quantidade_total_base, unidade_base
    FROM estoque_ingredientes
    WHERE ingrediente_id = ?
    `,
    [ingredientId]
  );
  return rows?.[0] || null;
}

async function ensureNoOpenCashes(token) {
  const openCashes = await listOpenCashes(token);
  for (const cash of openCashes) {
    const details = await getCashById(token, cash.id);
    const expected = Number(details?.resumo?.valor_esperado || 0);
    const closeRes = await closeCashById({
      token,
      cashId: cash.id,
      valorFinal: Math.max(expected, 0),
      observacao: 'Cleanup automatico da suite gerencial',
    });
    assert(
      closeRes.ok,
      `Falha no cleanup do caixa ${cash.id}: HTTP ${closeRes.status}`
    );
  }
}

async function createDeterministicCatalog() {
  const stamp = Date.now();
  const ingredientName = `ING_GERENCIAL_${stamp}`;
  const productName = `PROD_GERENCIAL_${stamp}`;

  const [ingredientInsert] = await db.query(
    `
    INSERT INTO itens (
      nome,
      tipo,
      categoria,
      preco_venda,
      ativo,
      aparece_cardapio
    ) VALUES (?, 'INGREDIENTE', 'ingrediente', NULL, 1, 0)
    `,
    [ingredientName]
  );
  state.ingredientId = Number(ingredientInsert.insertId);

  await db.query(
    `
    INSERT INTO estoque_ingredientes (
      ingrediente_id,
      tipo_entrada,
      quantidade_entrada,
      pacotes_por_caixa,
      quantidade_por_pacote,
      unidade_medida,
      quantidade_total_base,
      unidade_base
    ) VALUES (?, 'medida', 3000, NULL, NULL, 'gr', 3000, 'gr')
    `,
    [state.ingredientId]
  );

  const [productInsert] = await db.query(
    `
    INSERT INTO itens (
      nome,
      tipo,
      categoria,
      preco_venda,
      ativo,
      aparece_cardapio
    ) VALUES (?, 'PRODUTO', 'hambúrguer', 20.00, 1, 1)
    `,
    [productName]
  );
  state.productId = Number(productInsert.insertId);

  await db.query(
    `
    INSERT INTO produto_ingredientes (
      produto_id,
      ingrediente_id,
      quantidade_usada,
      unidade_usada,
      quantidade_usada_base,
      unidade_base
    ) VALUES (?, ?, 10, 'gr', 10, 'gr')
    `,
    [state.productId, state.ingredientId]
  );
}

async function deactivateTestUsersAndItems(adminToken) {
  if (state.manager?.id) {
    await api(`/usuarios/${state.manager.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
  }
  if (state.seller?.id) {
    await api(`/usuarios/${state.seller.id}`, {
      method: 'DELETE',
      token: adminToken,
    });
  }
  if (state.productId) {
    await db.query(
      `
      UPDATE itens
      SET ativo = 0,
          aparece_cardapio = 0
      WHERE id = ?
      `,
      [state.productId]
    );
  }
  if (state.ingredientId) {
    await db.query(
      `
      UPDATE itens
      SET ativo = 0,
          aparece_cardapio = 0
      WHERE id = ?
      `,
      [state.ingredientId]
    );
  }
}

async function auditCount(action) {
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

await run('SETUP-01', 'Login admin', async () => {
  const adminLogin = await login('admin@estoque.com', 'admin123');
  state.admin = {
    id: adminLogin?.usuario?.id,
    token: adminLogin.token,
    email: adminLogin?.usuario?.email,
  };
  return `admin#${state.admin.id} autenticado`;
});

await run('SETUP-02', 'Criar usuarios de teste (gerente e vendedor)', async () => {
  const stamp = Date.now();
  const managerEmail = `manager_current_${stamp}@bf.local`;
  const sellerEmail = `seller_current_${stamp}@bf.local`;

  const managerCreate = await createUserByAdmin(state.admin.token, {
    nome: 'Manager Current',
    email: managerEmail,
    senha: 'senha123',
    nivel_acesso: 'gerente',
    ativo: true,
  });
  assert(managerCreate.ok, `Falha ao criar gerente: HTTP ${managerCreate.status}`);

  const sellerCreate = await createUserByAdmin(state.admin.token, {
    nome: 'Seller Current',
    email: sellerEmail,
    senha: 'senha123',
    nivel_acesso: 'vendedor',
    ativo: true,
  });
  assert(sellerCreate.ok, `Falha ao criar vendedor: HTTP ${sellerCreate.status}`);

  const managerLogin = await login(managerEmail, 'senha123');
  const sellerLogin = await login(sellerEmail, 'senha123');

  state.manager = {
    id: managerCreate.data?.usuario?.id,
    token: managerLogin.token,
    email: managerEmail,
  };
  state.seller = {
    id: sellerCreate.data?.usuario?.id,
    token: sellerLogin.token,
    email: sellerEmail,
  };

  return `manager#${state.manager.id} e seller#${state.seller.id} criados`;
});

await run('SETUP-03', 'Fechar caixas abertos anteriores', async () => {
  await ensureNoOpenCashes(state.admin.token);
  return 'cleanup de caixas aberto concluido';
});

await run('SETUP-04', 'Criar catalogo deterministico para venda/estoque', async () => {
  await createDeterministicCatalog();
  return `produto#${state.productId} ingrediente#${state.ingredientId}`;
});

await run('T1', 'Gerente abre caixa com sucesso', async () => {
  const res = await openCash({
    token: state.manager.token,
    numero: 1,
    operadorId: state.manager.id,
    valorInicial: 100,
    observacao: 'Abertura T1',
  });
  assert([200, 201].includes(res.status), `HTTP ${res.status}`);
  assert(res.data?.message === 'Caixa aberto com sucesso.', `Mensagem inesperada: ${res.data?.message}`);
  assert(String(res.data?.caixa?.status).toUpperCase() === 'ABERTO', 'Caixa nao abriu');
  state.cash.one = Number(res.data?.caixa?.id);
  return `caixa#${state.cash.one} aberto`;
});

await run('T2', 'Multi-caixa: abrir caixas 2, 3 e 4', async () => {
  const two = await openCash({
    token: state.admin.token,
    numero: 2,
    operadorId: state.admin.id,
    valorInicial: 100,
    observacao: 'Abertura T2 - caixa 2',
  });
  assert(two.ok, `Falha caixa 2: HTTP ${two.status}`);
  state.cash.two = Number(two.data?.caixa?.id);

  const three = await openCash({
    token: state.admin.token,
    numero: 3,
    operadorId: state.admin.id,
    valorInicial: 100,
    observacao: 'Abertura T2 - caixa 3',
  });
  assert(three.ok, `Falha caixa 3: HTTP ${three.status}`);
  state.cash.three = Number(three.data?.caixa?.id);

  const four = await openCash({
    token: state.admin.token,
    numero: 4,
    operadorId: state.admin.id,
    valorInicial: 100,
    observacao: 'Abertura T2 - caixa 4',
  });
  assert(four.ok, `Falha caixa 4: HTTP ${four.status}`);
  state.cash.four = Number(four.data?.caixa?.id);

  const openList = await listOpenCashes(state.admin.token);
  assert(openList.length >= 4, `Esperado >=4 caixas abertos, veio ${openList.length}`);
  return `abertos: ${openList.map((c) => c.numero).join(', ')}`;
});

await run('T3', 'Nao permitir abrir o mesmo numero de caixa ja aberto', async () => {
  const res = await openCash({
    token: state.admin.token,
    numero: 2,
    operadorId: state.admin.id,
    valorInicial: 100,
    observacao: 'Duplicado T3',
  });
  assert(res.status === 409, `Esperado 409, veio ${res.status}`);
  return 'bloqueou duplicidade de numero';
});

await run('T4', 'Vendedor sem permissao nao abre caixa sem override', async () => {
  const res = await openCash({
    token: state.seller.token,
    numero: 5,
    operadorId: state.seller.id,
    valorInicial: 100,
    observacao: 'T4 vendedor sem autorizacao',
  });
  assert(res.status === 403, `Esperado 403, veio ${res.status}`);
  return 'bloqueado corretamente';
});

await run('T5', 'Vendedor abre caixa com autorizacao gerencial', async () => {
  const auth = await authorizeManagerAction(state.seller.token, {
    acao: 'abrir_caixa',
    identificador: state.manager.email,
    senha: 'senha123',
    motivo: 'Abertura de caixa vendedor T5',
    valor: 100,
  });
  assert(auth.ok, `Autorizacao falhou: HTTP ${auth.status}`);
  const override = auth.data?.autorizacao?.token;
  assert(override, 'Token gerencial nao retornado');

  const res = await openCash({
    token: state.seller.token,
    numero: 5,
    operadorId: state.seller.id,
    valorInicial: 100,
    observacao: 'T5 vendedor autorizado',
    gerencialToken: override,
  });
  assert([200, 201].includes(res.status), `HTTP ${res.status}`);
  state.cash.sellerFive = Number(res.data?.caixa?.id);
  return `caixa vendedor#${state.cash.sellerFive} aberto`;
});

await run('T6', 'Pedido sem caixa_id deve falhar', async () => {
  const res = await api('/pedidos', {
    method: 'POST',
    token: state.admin.token,
    body: {
      cliente_nome: 'Sem caixa',
      tipo: 'balcao',
      forma_pagamento: 'dinheiro',
      status_pagamento: 'pago',
      itens: [{ item_id: state.productId, quantidade: 1 }],
    },
  });
  assert(res.status === 400, `Esperado 400, veio ${res.status}`);
  return res.data?.message || 'erro 400';
});

await run('T7', 'Pedido em caixa fechado deve falhar', async () => {
  const cashTwoDetails = await getCashById(state.admin.token, state.cash.two);
  const expected = Number(cashTwoDetails?.resumo?.valor_esperado || 0);
  const closeTwo = await closeCashById({
    token: state.admin.token,
    cashId: state.cash.two,
    valorFinal: expected,
    observacao: 'Fechamento T7 caixa 2',
  });
  assert(closeTwo.ok, `Falha ao fechar caixa 2: HTTP ${closeTwo.status}`);

  const sale = await createOrder({
    token: state.admin.token,
    cashId: state.cash.two,
    itemId: state.productId,
    quantidade: 1,
    formaPagamento: 'dinheiro',
    clienteNome: 'Venda caixa fechado T7',
  });
  assert(sale.status === 409, `Esperado 409, veio ${sale.status}`);
  return 'venda bloqueada em caixa fechado';
});

await run('T8', 'Venda em caixa aberto com caixa_id obrigatorio', async () => {
  const stockBefore = await getIngredientStock(state.ingredientId);
  assert(stockBefore, 'Estoque de ingrediente nao encontrado');
  const beforeQty = Number(stockBefore.quantidade_total_base);

  const sale = await createOrder({
    token: state.admin.token,
    cashId: state.cash.one,
    itemId: state.productId,
    quantidade: 1,
    formaPagamento: 'dinheiro',
    clienteNome: 'Venda T8',
  });
  assert(sale.status === 201, `Esperado 201, veio ${sale.status}`);
  assert(Number(sale.data?.pedido?.caixa_id) === state.cash.one, 'pedido.caixa_id incorreto');
  assert(sale.data?.pedido?.status_pagamento === 'pago', 'status_pagamento deveria ser pago');
  state.orders.t8 = Number(sale.data?.pedido?.id);

  const stockAfter = await getIngredientStock(state.ingredientId);
  const afterQty = Number(stockAfter.quantidade_total_base);
  assert(afterQty === beforeQty - 10, `Estoque deveria cair 10. Antes=${beforeQty}, depois=${afterQty}`);
  return `pedido#${state.orders.t8} criado com baixa de estoque`;
});

await run('T9', 'Pedido da venda aparece na cozinha', async () => {
  const kitchenOrders = await getKitchenOrders(state.admin.token);
  const found = kitchenOrders.some((order) => Number(order.id) === state.orders.t8);
  assert(found, `Pedido ${state.orders.t8} nao apareceu na cozinha`);
  return `pedido#${state.orders.t8} visivel na cozinha`;
});

await run('T10', 'Vendas por caixa mostram apenas vendas do proprio caixa', async () => {
  const cashOneSales = await listCashSales(state.admin.token, state.cash.one);
  const hasWrongCash = cashOneSales.some(
    (sale) => Number(sale.caixa_id) !== Number(state.cash.one)
  );
  assert(!hasWrongCash, 'Encontrou venda de outro caixa na listagem do caixa 1');

  const foundOrder = cashOneSales.some((sale) => Number(sale.id) === state.orders.t8);
  assert(foundOrder, `Pedido ${state.orders.t8} nao listado no caixa correto`);
  return `caixa#${state.cash.one} listou apenas suas vendas`;
});

await run('T11', 'Movimento de caixa tipo venda e pedidos listam a venda', async () => {
  const movements = await getCashMovements(state.admin.token, state.cash.one);
  const movement = movements.find(
    (item) => Number(item.pedido_id) === state.orders.t8 && item.tipo === 'venda'
  );
  assert(movement, `Movimento de venda nao encontrado para pedido ${state.orders.t8}`);

  const orders = await getOrders(state.admin.token);
  const foundOrder = orders.some((order) => Number(order.id) === state.orders.t8);
  assert(foundOrder, `Pedido ${state.orders.t8} nao encontrado em /pedidos`);
  return 'pedido e movimento de venda confirmados';
});

await run('T12', 'Resumo do caixa soma venda em dinheiro no valor esperado', async () => {
  const details = await getCashById(state.admin.token, state.cash.one);
  const resumo = details?.resumo || {};
  assert(toNum(resumo.total_vendas) >= 20, `total_vendas invalido: ${resumo.total_vendas}`);
  assert(toNum(resumo.vendas_dinheiro) >= 20, `vendas_dinheiro invalido: ${resumo.vendas_dinheiro}`);
  assert(toNum(resumo.valor_esperado) >= 120, `valor_esperado invalido: ${resumo.valor_esperado}`);
  return `resumo caixa#${state.cash.one} ok`;
});

await run('T13', 'Venda pix nao altera dinheiro fisico esperado', async () => {
  const before = await getCashById(state.admin.token, state.cash.one);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const salePix = await createOrder({
    token: state.admin.token,
    cashId: state.cash.one,
    itemId: state.productId,
    formaPagamento: 'pix',
    quantidade: 1,
    clienteNome: 'Venda Pix T13',
  });
  assert(salePix.ok, `Venda pix falhou: HTTP ${salePix.status}`);

  const after = await getCashById(state.admin.token, state.cash.one);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === expectedBefore, `Pix nao deveria alterar esperado. Antes=${expectedBefore}, depois=${expectedAfter}`);
  return 'pix nao alterou dinheiro fisico';
});

await run('T14', 'Venda cartao credito nao altera dinheiro fisico esperado', async () => {
  const before = await getCashById(state.admin.token, state.cash.one);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const saleCard = await createOrder({
    token: state.admin.token,
    cashId: state.cash.one,
    itemId: state.productId,
    formaPagamento: 'cartao_credito',
    quantidade: 1,
    clienteNome: 'Venda Cartao T14',
  });
  assert(saleCard.ok, `Venda cartao falhou: HTTP ${saleCard.status}`);

  const after = await getCashById(state.admin.token, state.cash.one);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === expectedBefore, `Cartao nao deveria alterar esperado. Antes=${expectedBefore}, depois=${expectedAfter}`);
  return 'cartao nao alterou dinheiro fisico';
});

await run('T15', 'Venda em dinheiro altera dinheiro fisico esperado', async () => {
  const before = await getCashById(state.admin.token, state.cash.one);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const saleCash = await createOrder({
    token: state.admin.token,
    cashId: state.cash.one,
    itemId: state.productId,
    formaPagamento: 'dinheiro',
    quantidade: 1,
    clienteNome: 'Venda Dinheiro T15',
  });
  assert(saleCash.ok, `Venda dinheiro falhou: HTTP ${saleCash.status}`);

  const after = await getCashById(state.admin.token, state.cash.one);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === toNum(expectedBefore + 20), `Esperado +20 no fisico. Antes=${expectedBefore}, depois=${expectedAfter}`);
  return 'dinheiro alterou fisico corretamente';
});

await run('T16', 'Suprimento com motivo aumenta valor esperado', async () => {
  const before = await getCashById(state.admin.token, state.cash.one);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const supr = await createMovement({
    token: state.admin.token,
    cashId: state.cash.one,
    tipo: 'suprimento',
    valor: 50,
    motivo: 'Troco adicional T16',
  });
  assert([200, 201].includes(supr.status), `HTTP ${supr.status}`);

  const after = await getCashById(state.admin.token, state.cash.one);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === toNum(expectedBefore + 50), `Suprimento deveria +50. Antes=${expectedBefore}, depois=${expectedAfter}`);
  return 'suprimento aplicado';
});

await run('T17', 'Suprimento sem motivo deve falhar', async () => {
  const supr = await createMovement({
    token: state.admin.token,
    cashId: state.cash.one,
    tipo: 'suprimento',
    valor: 10,
    motivo: '',
  });
  assert(supr.status === 400, `Esperado 400, veio ${supr.status}`);
  return 'bloqueou suprimento sem motivo';
});

await run('T18', 'Sangria com motivo reduz valor esperado', async () => {
  const before = await getCashById(state.admin.token, state.cash.one);
  const expectedBefore = toNum(before?.resumo?.valor_esperado);

  const sangria = await createMovement({
    token: state.admin.token,
    cashId: state.cash.one,
    tipo: 'sangria',
    valor: 30,
    motivo: 'Retirada cofre T18',
  });
  assert([200, 201].includes(sangria.status), `HTTP ${sangria.status}`);

  const after = await getCashById(state.admin.token, state.cash.one);
  const expectedAfter = toNum(after?.resumo?.valor_esperado);
  assert(expectedAfter === toNum(expectedBefore - 30), `Sangria deveria -30. Antes=${expectedBefore}, depois=${expectedAfter}`);
  return 'sangria aplicada';
});

await run('T19', 'Sangria acima do esperado por vendedor sem autorizacao falha', async () => {
  const details = await getCashById(state.seller.token, state.cash.sellerFive);
  const expected = toNum(details?.resumo?.valor_esperado);
  const value = toNum(expected + 200);

  const sangria = await createMovement({
    token: state.seller.token,
    cashId: state.cash.sellerFive,
    tipo: 'sangria',
    valor: value,
    motivo: 'Acima esperado sem autorizacao',
  });
  assert([403, 409].includes(sangria.status), `Esperado 403/409, veio ${sangria.status}`);
  return `bloqueou sangria ${value} sem override`;
});

await run('T20', 'Sangria acima do esperado por vendedor com autorizacao funciona', async () => {
  const details = await getCashById(state.seller.token, state.cash.sellerFive);
  const expected = toNum(details?.resumo?.valor_esperado);
  const value = toNum(expected + 150);

  const auth = await authorizeManagerAction(state.seller.token, {
    acao: 'registrar_sangria',
    identificador: state.manager.email,
    senha: 'senha123',
    motivo: 'Sangria acima esperado T20',
    registro_id: state.cash.sellerFive,
    valor: value,
  });
  assert(auth.ok, `Autorizacao falhou: HTTP ${auth.status}`);
  const override = auth.data?.autorizacao?.token;
  assert(override, 'Token gerencial nao retornado');

  const sangria = await createMovement({
    token: state.seller.token,
    cashId: state.cash.sellerFive,
    tipo: 'sangria',
    valor: value,
    motivo: 'Sangria autorizada T20',
    gerencialToken: override,
  });
  assert([200, 201].includes(sangria.status), `Esperado 200/201, veio ${sangria.status}`);
  return `sangria autorizada ${value} registrada`;
});

await run('T21', 'Fechamento com diferenca sem observacao deve falhar', async () => {
  const details = await getCashById(state.admin.token, state.cash.one);
  const expected = toNum(details?.resumo?.valor_esperado);
  const close = await closeCashById({
    token: state.admin.token,
    cashId: state.cash.one,
    valorFinal: expected - 10,
    observacao: '',
  });
  assert(close.status === 400, `Esperado 400, veio ${close.status}`);
  return 'bloqueou fechamento sem observacao';
});

await run('T22', 'Fechamento do caixa correto com diferenca e observacao', async () => {
  const details = await getCashById(state.admin.token, state.cash.one);
  const expected = toNum(details?.resumo?.valor_esperado);
  const close = await closeCashById({
    token: state.admin.token,
    cashId: state.cash.one,
    valorFinal: expected - 10,
    observacao: 'Falta conferida T22',
  });
  assert(close.ok, `Fechamento falhou: HTTP ${close.status}`);
  assert(String(close.data?.caixa?.status).toUpperCase() === 'FECHADO', 'Caixa deveria fechar');
  assert(toNum(close.data?.resumo?.diferenca) === -10, `Diferenca esperada -10, veio ${close.data?.resumo?.diferenca}`);
  return `caixa#${state.cash.one} fechado com diferenca -10`;
});

await run('T23', 'Vendedor nao fecha caixa sem autorizacao gerencial', async () => {
  const details = await getCashById(state.admin.token, state.cash.three);
  const expected = toNum(details?.resumo?.valor_esperado);
  const close = await closeCashById({
    token: state.seller.token,
    cashId: state.cash.three,
    valorFinal: expected,
    observacao: 'Vendedor sem autorizacao T23',
  });
  assert(close.status === 403, `Esperado 403, veio ${close.status}`);
  return 'bloqueou fechamento sem override';
});

await run('T24', 'Vendedor fecha caixa com autorizacao gerencial', async () => {
  const details = await getCashById(state.admin.token, state.cash.three);
  const expected = toNum(details?.resumo?.valor_esperado);

  const auth = await authorizeManagerAction(state.seller.token, {
    acao: 'fechar_caixa',
    identificador: state.manager.email,
    senha: 'senha123',
    motivo: 'Fechamento autorizado T24',
    registro_id: state.cash.three,
    valor: expected,
  });
  assert(auth.ok, `Autorizacao falhou: HTTP ${auth.status}`);
  const override = auth.data?.autorizacao?.token;
  assert(override, 'Token gerencial nao retornado');

  const close = await closeCashById({
    token: state.seller.token,
    cashId: state.cash.three,
    valorFinal: expected,
    observacao: 'Fechamento autorizado vendedor T24',
    gerencialToken: override,
  });
  assert(close.ok, `Fechamento vendedor falhou: HTTP ${close.status}`);
  assert(String(close.data?.caixa?.status).toUpperCase() === 'FECHADO', 'Caixa deveria ficar fechado');
  return `caixa#${state.cash.three} fechado por vendedor autorizado`;
});

await run('T25', 'Fechar um caixa nao bloqueia venda nos outros caixas abertos', async () => {
  const blocked = await createOrder({
    token: state.admin.token,
    cashId: state.cash.one,
    itemId: state.productId,
    quantidade: 1,
    formaPagamento: 'dinheiro',
    clienteNome: 'Venda em caixa fechado T25',
  });
  assert(blocked.status === 409, `Venda em caixa fechado deveria 409, veio ${blocked.status}`);

  const saleOpen = await createOrder({
    token: state.admin.token,
    cashId: state.cash.four,
    itemId: state.productId,
    quantidade: 1,
    formaPagamento: 'dinheiro',
    clienteNome: 'Venda caixa aberto T25',
  });
  assert(saleOpen.status === 201, `Venda em caixa aberto deveria 201, veio ${saleOpen.status}`);
  state.orders.t25 = Number(saleOpen.data?.pedido?.id);
  return `caixa aberto continuou vendendo (pedido#${state.orders.t25})`;
});

await run('T26', 'Auditoria das acoes gerenciais obrigatorias', async () => {
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
    counts[action] = await auditCount(action);
  }
  const missing = requiredActions.filter((action) => counts[action] <= 0);
  assert(missing.length === 0, `Sem auditoria para: ${missing.join(', ')}`);
  return JSON.stringify(counts);
});

await run('T27', 'Erros retornam JSON e nao HTML', async () => {
  const noToken = await api('/caixas/abertos');
  assert(noToken.status === 401, `Sem token deveria 401, veio ${noToken.status}`);
  assert(String(noToken.contentType).includes('application/json'), 'Sem token nao retornou JSON');

  const badToken = await api('/caixas/abertos', {
    token: 'token.invalido.gerencial',
  });
  assert(badToken.status === 401, `Token invalido deveria 401, veio ${badToken.status}`);
  assert(String(badToken.contentType).includes('application/json'), 'Token invalido nao retornou JSON');

  return 'validacao de erros JSON ok';
});

await run('CLEANUP', 'Fechar caixas e desativar usuarios/itens de teste', async () => {
  await ensureNoOpenCashes(state.admin.token);
  await deactivateTestUsersAndItems(state.admin.token);
  return 'cleanup concluido';
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
  started_at: state.startedAt,
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

if (summary.FAIL > 0) {
  process.exitCode = 1;
}
