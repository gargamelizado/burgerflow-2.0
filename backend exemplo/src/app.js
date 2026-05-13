/**
 * @file app.js
 * @description Configura a aplicacao Express, rotas legadas, rotas MVC novas, Swagger e regras operacionais do BurgerFlow.
 * @author BurgerFlow
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import db from './config/db.js';
import { env } from './config/env.js';
import {
  allowedAccessLevels,
  businessProfiles,
  hasPermission,
  normalizeBusinessType,
  permissions,
  roleLabels
} from './config/businessRules.js';
import { broadcastKitchenEvent } from './realtime/kitchenHub.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';
import recoverOrderRoutes from './modules/recover-order/recoverOrder.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/product.routes.js';
import cashRoutes from './modules/cash/cash.routes.js';
import nodeRedRoutes from './modules/integrations/nodeRed.routes.js';
import { audit, registerOrderStatusHistory } from './repositories/audit.repository.js';
import { normalizeKitchenStation, resolveKitchenStation, resolveReturnStations } from './utils/kitchenRouting.js';

const app = express();
const businessType = normalizeBusinessType(env.BUSINESS_TYPE);
const MAX_SALE_ITEM_QUANTITY = 9999;
const PIX_EXPIRES_MINUTES = 5;

app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  req.businessType = businessType;
  next();
});

// Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BurgerFlow POS API',
      version: '1.0.0',
      description: 'API para o sistema BurgerFlow POS',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT || 3006}`,
      },
    ],
  },
  apis: ['./src/app.js'], // files containing annotations
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

const normalizeCategory = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
};

const parseProductPayload = (body) => {
  const nome = body.nome?.trim();
  const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : null;
  const categoria = normalizeCategory(body.categoria);
  const codigoBarras = typeof body.codigo_barras === 'string' ? body.codigo_barras.trim() : null;
  const preco = Number(body.preco);
  const custo = Number(body.custo ?? 0);
  const extraPrice = Number(body.extra_price ?? body.preco_adicional ?? 0);
  const quantidade = Number(body.quantidade);
  const estoqueMinimo = Number(body.estoque_minimo ?? 0);
  const unidade = String(body.unidade || 'un').trim() || 'un';
  const typeAliases = {
    simple: 'simples',
    composed: 'composto',
    sandwich: 'composto',
    sanduiche: 'composto',
    sanduíche: 'composto',
    hamburger: 'composto',
    hamburguer: 'composto',
    hambúrguer: 'composto',
    drink: 'simples',
    dessert: 'simples',
    ingredient: 'ingrediente'
  };
  const rawType = String(body.tipo || body.type || 'simples');
  const tipoNormalizado = typeAliases[rawType] || rawType;
  const tipo = ['simples', 'composto', 'combo', 'producao_interna', 'ingrediente'].includes(tipoNormalizado)
    ? tipoNormalizado
    : 'simples';
  const ativo = body.ativo === undefined ? true : Boolean(body.ativo);
  const estacaoCozinha = resolveKitchenStation({
    nome,
    categoria,
    tipo,
    estacao_cozinha: body.estacao_cozinha
  });

  if (!nome) {
    return { error: 'Nome do produto é obrigatório.' };
  }

  if (!Number.isFinite(preco) || preco < 0) {
    return { error: 'Preço inválido.' };
  }

  if (!Number.isFinite(custo) || custo < 0) {
    return { error: 'Custo inválido.' };
  }

  if (!Number.isFinite(extraPrice) || extraPrice < 0) {
    return { error: 'Preço adicional inválido.' };
  }

  if (!Number.isFinite(quantidade) || quantidade < 0) {
    return { error: 'Estoque atual inválido.' };
  }

  if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) {
    return { error: 'Estoque mínimo inválido.' };
  }

  return {
    payload: {
      nome,
      descricao: descricao || null,
      categoria,
      codigo_barras: businessType === 'fast_food' ? null : codigoBarras || null,
      tipo,
      preco,
      custo,
      extra_price: extraPrice,
      quantidade,
      estoque_minimo: estoqueMinimo,
      unidade,
      ativo,
      estacao_cozinha: estacaoCozinha
    }
  };
};

const parseSalePayload = (body) => {
  const rawItems = Array.isArray(body.itens) && body.itens.length > 0
    ? body.itens
    : [{ produto_id: body.produto_id, quantidade: body.quantidade }];

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: 'Adicione ao menos um item à venda.' };
  }

  const parsedItems = [];

  for (const [index, item] of rawItems.entries()) {
    const produtoId = Number(item?.produto_id);
    const quantidade = Number(item?.quantidade);
    const rawCustomizations = Array.isArray(item?.customizations)
      ? item.customizations
      : Array.isArray(item?.personalizacoes)
        ? item.personalizacoes
        : [];

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      return { error: 'Produto inválido.' };
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      return { error: 'A quantidade da venda deve ser um número inteiro maior que zero.' };
    }

    if (quantidade > MAX_SALE_ITEM_QUANTITY) {
      return { error: `A quantidade máxima por item é ${MAX_SALE_ITEM_QUANTITY}.` };
    }

    const customizations = [];
    for (const customization of rawCustomizations) {
      const type = String(customization?.type || customization?.tipo || '').trim().toLowerCase();
      const ingredienteId = Number(customization?.ingrediente_id || customization?.ingredient_id);
      const customizationQuantity = Number(customization?.quantity || customization?.quantidade || 1);

      if (!['removed', 'extra', 'substitution'].includes(type)) {
        return { error: 'Tipo de personalização inválido.' };
      }

      if (!Number.isInteger(ingredienteId) || ingredienteId <= 0) {
        return { error: 'Ingrediente da personalização inválido.' };
      }

      if (!Number.isFinite(customizationQuantity) || customizationQuantity <= 0) {
        return { error: 'Quantidade da personalização inválida.' };
      }

      customizations.push({
        type,
        ingredienteId,
        quantity: customizationQuantity
      });
    }

    parsedItems.push({
      lineId: String(item?.line_id || item?.cart_id || `item-${index}`),
      produtoId,
      quantidade,
      customizations
    });
  }

  return {
    payload: {
      items: parsedItems,
      formaPagamento: String(body.forma_pagamento || 'dinheiro').trim() || 'dinheiro',
      pagamentos: Array.isArray(body.pagamentos) ? body.pagamentos : null,
      dinheiroRecebido: Number(body.valor_recebido || 0),
      desconto: Number(body.desconto || 0),
      canal: String(body.canal || 'balcao').trim() || 'balcao',
      receitaMedica: body.receita_medica || null,
      clienteId: body.cliente_id ? Number(body.cliente_id) : null
    }
  };
};

const channelMap = {
  balcao: 'counter',
  counter: 'counter',
  delivery: 'delivery',
  drive_thru: 'drive_thru',
  totem: 'kiosk',
  kiosk: 'kiosk',
  mobile_app: 'mobile_app',
  whatsapp: 'whatsapp',
  marketplace: 'marketplace'
};

const normalizePaymentMethod = (value) => {
  const method = String(value || 'dinheiro').trim().toLowerCase();
  const aliases = {
    cartao: 'card_credit',
    credito: 'card_credit',
    debito: 'card_debit',
    voucher: 'voucher',
    dinheiro: 'cash',
    pix: 'pix',
    cash: 'cash'
  };
  return aliases[method] || method;
};

function buildPixPayload(paymentId) {
  const suffix = `${Date.now()}${paymentId || ''}`.slice(-10);
  return {
    qr_code: `pix_fake_${suffix}`,
    pix_code: `000201BR.GOV.BCB.PIX.BURGERFLOWERP.${suffix}`
  };
}

function normalizeSalePayments(payload, total) {
  const rawPayments = Array.isArray(payload.pagamentos) && payload.pagamentos.length > 0
    ? payload.pagamentos
    : [{
        metodo: payload.formaPagamento,
        valor: total,
        valor_recebido: payload.dinheiroRecebido || undefined
      }];

  const payments = rawPayments.map((payment) => {
    const method = normalizePaymentMethod(payment.metodo || payment.method || payment.forma_pagamento);
    const amount = Number(payment.valor ?? payment.amount ?? 0);
    const received = payment.valor_recebido === undefined ? null : Number(payment.valor_recebido);

    return {
      metodo: method,
      valor: Number(amount.toFixed(2)),
      valor_recebido: received === null ? null : Number(received.toFixed(2)),
      troco: method === 'cash' && received !== null ? Number(Math.max(0, received - amount).toFixed(2)) : 0,
      status: method === 'pix' ? 'pending' : 'approved',
      sandbox_result: String(payment.sandbox_result || 'approved')
    };
  });

  if (payments.some((payment) => !Number.isFinite(payment.valor) || payment.valor <= 0)) {
    return { error: 'Pagamento inválido.' };
  }

  if (payments.some((payment) => payment.metodo === 'cash' && payment.valor_recebido !== null && payment.valor_recebido < payment.valor)) {
    return { error: 'Valor recebido em dinheiro menor que o valor pago.' };
  }

  const totalPayments = Number(payments.reduce((sum, payment) => sum + payment.valor, 0).toFixed(2));
  if (totalPayments !== Number(total.toFixed(2))) {
    return { error: 'A soma dos pagamentos deve ser igual ao total da venda.' };
  }

  return { payments };
}

async function getSetting(connection, key, fallback = null) {
  const [rows] = await connection.query('SELECT valor FROM configuracoes WHERE chave = ? LIMIT 1', [key]);
  return rows.length > 0 ? rows[0].valor : fallback;
}

async function getOpenCash(connection, userId = null) {
  const params = [];
  let sql = "SELECT * FROM caixas WHERE status = 'aberto'";
  if (userId) {
    sql += ' AND usuario_abertura_id = ?';
    params.push(userId);
  }
  sql += ' ORDER BY aberto_em DESC LIMIT 1';
  const [rows] = await connection.query(sql, params);
  return rows[0] || null;
}

async function ensureOpenCashIfRequired(connection, userId = null) {
  const required = await getSetting(connection, 'exigir_caixa_aberto', 'true');
  if (required !== 'true') return null;
  const cash = await getOpenCash(connection, userId);
  if (!cash) {
    const error = new Error('Abra o caixa antes de vender.');
    error.statusCode = 400;
    throw error;
  }
  return cash;
}

async function getCashSummary(connection, cashId) {
  const [[cash]] = await connection.query('SELECT * FROM caixas WHERE id = ?', [cashId]);
  if (!cash) return null;

  const [[sales]] = await connection.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN p.metodo IN ('cash','dinheiro') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_dinheiro,
        COALESCE(SUM(CASE WHEN p.metodo = 'pix' AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_pix,
        COALESCE(SUM(CASE WHEN p.metodo IN ('card_credit','cartao','credito') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_credito,
        COALESCE(SUM(CASE WHEN p.metodo IN ('card_debit','debito') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_debito,
        COALESCE(SUM(CASE WHEN p.metodo = 'voucher' AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS vendas_voucher,
        COALESCE(SUM(CASE WHEN p.metodo IN ('cash','dinheiro') AND p.status IN ('approved','aprovado') THEN p.troco ELSE 0 END), 0) AS troco
      FROM pagamentos p
      JOIN vendas v ON v.id = p.venda_id
      WHERE p.caixa_id = ? AND v.status <> 'cancelada'
    `,
    [cashId]
  );

  const [[moves]] = await connection.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'suprimento' THEN valor ELSE 0 END), 0) AS suprimentos,
        COALESCE(SUM(CASE WHEN tipo = 'sangria' THEN valor ELSE 0 END), 0) AS sangrias,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas
      FROM caixa_movimentos
      WHERE caixa_id = ?
    `,
    [cashId]
  );

  const cashBalance = Number((
    Number(cash.valor_abertura) +
    Number(sales.vendas_dinheiro) +
    Number(moves.suprimentos) -
    Number(moves.sangrias) -
    Number(moves.despesas)
  ).toFixed(2));

  return {
    caixa: cash,
    total_vendido: Number((Number(sales.vendas_dinheiro) + Number(sales.vendas_pix) + Number(sales.vendas_credito) + Number(sales.vendas_debito) + Number(sales.vendas_voucher)).toFixed(2)),
    cash_total: Number(sales.vendas_dinheiro),
    pix_total: Number(sales.vendas_pix),
    card_total: Number((Number(sales.vendas_credito) + Number(sales.vendas_debito)).toFixed(2)),
    voucher_total: Number(sales.vendas_voucher),
    total_sales: Number((Number(sales.vendas_dinheiro) + Number(sales.vendas_pix) + Number(sales.vendas_credito) + Number(sales.vendas_debito) + Number(sales.vendas_voucher)).toFixed(2)),
    total_dinheiro: Number(sales.vendas_dinheiro),
    total_pix: Number(sales.vendas_pix),
    total_cartao_credito: Number(sales.vendas_credito),
    total_cartao_debito: Number(sales.vendas_debito),
    total_voucher: Number(sales.vendas_voucher),
    total_sangrias: Number(moves.sangrias),
    total_suprimentos: Number(moves.suprimentos),
    total_despesas: Number(moves.despesas),
    total_troco: Number(sales.troco),
    valor_esperado_dinheiro: cashBalance,
    cash_balance: cashBalance
  };
}

async function getCashAlerts(connection, cashId) {
  const summary = await getCashSummary(connection, cashId);
  if (!summary) return [];

  const alertLimit = Number(await getSetting(connection, 'limite_alerta_dinheiro', businessType === 'fast_food' ? '300' : '500'));
  const blockLimit = Number(await getSetting(connection, 'limite_bloqueio_dinheiro', businessType === 'fast_food' ? '800' : '3000'));
  const alerts = [];

  if (summary.cash_balance >= blockLimit) {
    alerts.push({
      type: 'cash.blocked',
      severity: 'critical',
      message: 'Caixa atingiu o limite máximo. Realize sangria para continuar vendendo.'
    });
  } else if (summary.cash_balance > alertLimit) {
    alerts.push({
      type: 'cash.high_value',
      severity: 'warning',
      message: 'Caixa com valor alto. Recomenda-se realizar sangria.'
    });
  }

  const [[lastWithdrawal]] = await connection.query(
    "SELECT created_at FROM caixa_movimentos WHERE caixa_id = ? AND tipo = 'sangria' ORDER BY created_at DESC LIMIT 1",
    [cashId]
  );
  const referenceDate = lastWithdrawal?.created_at || summary.caixa.aberto_em;
  if (referenceDate && Date.now() - new Date(referenceDate).getTime() > 4 * 60 * 60 * 1000) {
    alerts.push({
      type: 'cash.no_withdrawal',
      severity: 'info',
      message: 'Caixa sem sangria há muito tempo.'
    });
  }

  return alerts;
}

async function ensureCashCanSell(connection, cash) {
  if (!cash) return;
  const alerts = await getCashAlerts(connection, cash.id);
  const blocked = alerts.find((alert) => alert.type === 'cash.blocked');
  if (blocked) {
    const error = new Error(blocked.message);
    error.statusCode = 423;
    error.alerts = alerts;
    throw error;
  }
}

async function registerStockMovement(connection, { produtoId, vendaId = null, usuarioId = null, tipo, quantidade, motivo = null }) {
  await connection.query(
    'INSERT INTO movimentacoes_estoque (produto_id, venda_id, usuario_id, tipo, quantidade, motivo) VALUES (?, ?, ?, ?, ?, ?)',
    [produtoId, vendaId, usuarioId, tipo, quantidade, motivo]
  );
}

function buildCustomizationText(customizations) {
  if (!customizations.length) return '';

  return customizations
    .map((item) => {
      if (item.type === 'removed') return `Sem ${item.ingredienteNome}`;
      if (item.type === 'extra') return `Com ${item.ingredienteNome} extra`;
      return `Substituição: ${item.ingredienteNome}`;
    })
    .join(', ');
}

async function loadRecipeItems(connection, productId) {
  const [recipeItems] = await connection.query(
    `
      SELECT
        r.*,
        p.nome AS ingrediente_nome,
        p.unidade AS ingrediente_unidade,
        p.extra_price AS ingrediente_extra_price,
        p.tipo,
        p.preco,
        p.custo,
        p.quantidade AS estoque_atual
      FROM receitas r
      JOIN produtos p ON p.id = r.ingrediente_id
      WHERE r.produto_id = ?
    `,
    [productId]
  );

  return recipeItems;
}

async function loadCustomizableRecipeItems(connection, product) {
  if ((product.tipo || 'simples') !== 'combo') {
    return loadRecipeItems(connection, product.id);
  }

  const [comboItems] = await connection.query(
    `
      SELECT ci.produto_id, ci.quantidade, p.*
      FROM combo_itens ci
      JOIN produtos p ON p.id = ci.produto_id
      WHERE ci.combo_id = ?
    `,
    [product.id]
  );
  const recipeByIngredientId = new Map();

  for (const comboItem of comboItems) {
    const recipeItems = await loadRecipeItems(connection, comboItem.produto_id);

    for (const recipeItem of recipeItems) {
      const ingredientId = Number(recipeItem.ingrediente_id);
      const current = recipeByIngredientId.get(ingredientId) || {
        ...recipeItem,
        quantidade: 0,
        removable: true,
        allow_extra: false,
        extra_price: Number(recipeItem.extra_price || 0)
      };

      current.quantidade += Number(recipeItem.quantidade || 0) * Number(comboItem.quantidade || 1);
      current.removable = current.removable && recipeItem.removable !== false && Number(recipeItem.removable) !== 0;
      current.allow_extra = current.allow_extra || (recipeItem.allow_extra !== false && Number(recipeItem.allow_extra) !== 0);
      current.extra_price = Math.max(Number(current.extra_price || 0), Number(recipeItem.extra_price || 0));
      recipeByIngredientId.set(ingredientId, current);
    }
  }

  return [...recipeByIngredientId.values()];
}

async function prepareSaleItemCustomization(connection, product, requestedCustomizations = []) {
  if (!Array.isArray(requestedCustomizations) || requestedCustomizations.length === 0) {
    return {
      customizations: [],
      summary: '',
      unitPriceDelta: 0,
      stockOptions: { removedIngredientIds: new Set(), extraConsumptions: [] }
    };
  }

  const recipeItems = await loadCustomizableRecipeItems(connection, product);
  const recipeByIngredientId = new Map(recipeItems.map((item) => [Number(item.ingrediente_id), item]));
  const normalized = [];
  const removedIngredientIds = new Set();
  const extraConsumptions = [];
  let unitPriceDelta = 0;

  for (const customization of requestedCustomizations) {
    const ingredientId = Number(customization.ingredienteId);
    const recipeItem = recipeByIngredientId.get(ingredientId);

    if (!recipeItem) {
      throw new Error('Ingrediente não pertence à receita deste item.');
    }

    if (customization.type === 'removed') {
      if (recipeItem.removable === false || Number(recipeItem.removable) === 0) {
        throw new Error(`${recipeItem.ingrediente_nome} não pode ser removido da receita.`);
      }

      removedIngredientIds.add(ingredientId);
      normalized.push({
        type: 'removed',
        ingredienteId: ingredientId,
        ingredienteNome: recipeItem.ingrediente_nome,
        quantity: Number(recipeItem.quantidade || 1),
        priceDelta: 0
      });
      continue;
    }

    if (customization.type === 'extra') {
      if (recipeItem.allow_extra === false || Number(recipeItem.allow_extra) === 0) {
        throw new Error(`${recipeItem.ingrediente_nome} não permite adicional.`);
      }

      const extraQuantity = Number(customization.quantity || 1);
      const extraPrice = Number(recipeItem.extra_price || recipeItem.ingrediente_extra_price || 0);
      const priceDelta = Number((extraPrice * extraQuantity).toFixed(2));
      unitPriceDelta += priceDelta;
      extraConsumptions.push({
        product: {
          id: recipeItem.ingrediente_id,
          nome: recipeItem.ingrediente_nome,
          tipo: recipeItem.tipo || 'ingrediente',
          quantidade: recipeItem.estoque_atual,
          preco: recipeItem.preco,
          custo: recipeItem.custo
        },
        quantity: extraQuantity
      });
      normalized.push({
        type: 'extra',
        ingredienteId: ingredientId,
        ingredienteNome: recipeItem.ingrediente_nome,
        quantity: extraQuantity,
        priceDelta
      });
      continue;
    }

    const substitutionQuantity = Number(customization.quantity || 1);
    const substitutionDelta = Number((Number(recipeItem.extra_price || recipeItem.ingrediente_extra_price || 0) * substitutionQuantity).toFixed(2));
    unitPriceDelta += substitutionDelta;
    normalized.push({
      type: 'substitution',
      ingredienteId: ingredientId,
      ingredienteNome: recipeItem.ingrediente_nome,
      quantity: substitutionQuantity,
      priceDelta: substitutionDelta
    });
  }

  return {
    customizations: normalized,
    summary: buildCustomizationText(normalized),
    unitPriceDelta: Number(unitPriceDelta.toFixed(2)),
    stockOptions: { removedIngredientIds, extraConsumptions }
  };
}

async function consumeProductStock(connection, product, quantity, vendaId, userId, visited = new Set(), options = {}) {
  const productId = Number(product.id);
  const productType = product.tipo || 'simples';
  const visitKey = `${productType}:${productId}`;

  if (visited.has(visitKey)) {
    throw new Error(`Ciclo detectado na ficha técnica do produto ${product.nome}.`);
  }

  visited.add(visitKey);

  try {
    if (productType === 'composto' || productType === 'producao_interna') {
      const recipeItems = await loadRecipeItems(connection, productId);

      if (recipeItems.length === 0) {
        if (businessType === 'fast_food') {
          await audit(connection, userId, 'estoque.ficha_tecnica_ausente', 'produtos', productId, {
            produto: product.nome,
            quantidade: quantity,
            venda_id: vendaId,
            observacao: 'Venda fast-food liberada para teste sem baixa de ingredientes.'
          });
          return;
        }

        throw new Error(`Produto composto sem ficha técnica: ${product.nome}`);
      }

      for (const item of recipeItems) {
        if (options.removedIngredientIds?.has(Number(item.ingrediente_id))) {
          continue;
        }

        await consumeProductStock(
          connection,
          {
            ...item,
            id: item.ingrediente_id,
            nome: item.ingrediente_nome,
            quantidade: item.estoque_atual
          },
          Number(item.quantidade) * quantity,
          vendaId,
          userId,
          visited
        );
      }

      for (const extra of options.extraConsumptions || []) {
        await consumeProductStock(connection, extra.product, Number(extra.quantity || 0) * quantity, vendaId, userId, visited);
      }

      return;
    }

    if (productType === 'combo') {
      const [comboItems] = await connection.query(
        `
          SELECT ci.produto_id, ci.quantidade, p.*
          FROM combo_itens ci
          JOIN produtos p ON p.id = ci.produto_id
          WHERE ci.combo_id = ?
        `,
        [productId]
      );

      if (comboItems.length === 0) {
        throw new Error(`Combo sem itens configurados: ${product.nome}`);
      }

      const nestedOptions = {
        removedIngredientIds: options.removedIngredientIds,
        extraConsumptions: []
      };

      for (const item of comboItems) {
        await consumeProductStock(connection, item, Number(item.quantidade) * quantity, vendaId, userId, visited, nestedOptions);
      }

      for (const extra of options.extraConsumptions || []) {
        await consumeProductStock(connection, extra.product, Number(extra.quantity || 0) * quantity, vendaId, userId, visited);
      }

      return;
    }

    const allowNegative = await getSetting(connection, 'venda_sem_estoque', 'false');
    if (allowNegative !== 'true' && quantity > Number(product.quantidade)) {
      throw new Error(`Estoque insuficiente para ${product.nome}. Disponível: ${product.quantidade}`);
    }

    await connection.query('UPDATE produtos SET quantidade = quantidade - ? WHERE id = ?', [quantity, productId]);
    await registerStockMovement(connection, {
      produtoId: productId,
      vendaId,
      usuarioId: userId,
      tipo: 'venda',
      quantidade: -quantity,
      motivo: 'Venda PDV'
    });
  } finally {
    visited.delete(visitKey);
  }
}

async function loadOrderItemCustomizations(connection, itemIds) {
  if (!itemIds.length) return new Map();

  const placeholders = itemIds.map(() => '?').join(', ');
  const [rows] = await connection.query(
    `
      SELECT c.*, p.nome AS ingrediente_nome, p.tipo, p.quantidade AS estoque_atual, p.preco, p.custo
      FROM order_item_customizations c
      JOIN produtos p ON p.id = c.ingrediente_id
      WHERE c.order_item_id IN (${placeholders})
      ORDER BY c.id ASC
    `,
    itemIds
  );
  const map = new Map();

  for (const row of rows) {
    const key = Number(row.order_item_id);
    const current = map.get(key) || [];
    current.push(row);
    map.set(key, current);
  }

  return map;
}

async function consumeSaleStock(connection, saleId, userId) {
  const [[sale]] = await connection.query('SELECT id, stock_consumed_at FROM vendas WHERE id = ? FOR UPDATE', [saleId]);
  if (!sale || sale.stock_consumed_at) return;

  const [items] = await connection.query(
    `
      SELECT
        iv.id AS order_item_id,
        iv.quantidade AS item_quantidade,
        p.*
      FROM itens_venda iv
      JOIN produtos p ON p.id = iv.produto_id
      WHERE iv.venda_id = ?
      FOR UPDATE
    `,
    [saleId]
  );
  const customizationsByItem = await loadOrderItemCustomizations(connection, items.map((item) => Number(item.order_item_id)));

  for (const item of items) {
    const customizations = customizationsByItem.get(Number(item.order_item_id)) || [];
    const removedIngredientIds = new Set(
      customizations
        .filter((customization) => customization.type === 'removed')
        .map((customization) => Number(customization.ingrediente_id))
    );
    const extraConsumptions = customizations
      .filter((customization) => customization.type === 'extra' || customization.type === 'substitution')
      .map((customization) => ({
        product: {
          id: customization.ingrediente_id,
          nome: customization.ingrediente_nome,
          tipo: customization.tipo || 'ingrediente',
          quantidade: customization.estoque_atual,
          preco: customization.preco,
          custo: customization.custo
        },
        quantity: Number(customization.quantity || 0)
      }));

    await consumeProductStock(
      connection,
      item,
      Number(item.item_quantidade),
      saleId,
      userId,
      new Set(),
      { removedIngredientIds, extraConsumptions }
    );
  }

  await connection.query('UPDATE vendas SET stock_consumed_at = CURRENT_TIMESTAMP WHERE id = ?', [saleId]);
}

async function sendSaleToKitchen(connection, saleId, items = null) {
  const useKitchen = await getSetting(connection, 'usar_cozinha', businessType === 'fast_food' ? 'true' : 'false');
  if (useKitchen !== 'true') return [];

  const [rows] = items
    ? [items]
    : await connection.query(
        `
          SELECT
            iv.id,
            iv.produto_id,
            iv.produto_nome,
            iv.categoria,
            iv.quantidade,
            iv.observacoes,
            iv.customization_summary,
            p.nome,
            p.tipo,
            p.preparation_station,
            p.estacao_cozinha
          FROM itens_venda iv
          LEFT JOIN produtos p ON p.id = iv.produto_id
          WHERE iv.venda_id = ?
        `,
        [saleId]
      );

  const routedRows = rows.map((item) => ({
    ...item,
    station: resolveKitchenStation(item)
  }));
  const stations = [...new Set(routedRows.map((item) => item.station))];
  const created = [];

  for (const station of stations) {
    const [kitchenResult] = await connection.query(
      'INSERT INTO pedidos_cozinha (venda_id, estacao, status) VALUES (?, ?, ?)',
      [saleId, station, 'recebido']
    );
    created.push({ id: kitchenResult.insertId, venda_id: saleId, estacao: station, status: 'recebido' });
  }

  for (const item of routedRows) {
    await connection.query(
      'INSERT INTO kitchen_order_items (order_id, order_item_id, station, status) VALUES (?, ?, ?, ?)',
      [saleId, item.id || null, item.station, 'received']
    );
  }

  await connection.query('UPDATE vendas SET sent_to_kitchen_at = COALESCE(sent_to_kitchen_at, CURRENT_TIMESTAMP) WHERE id = ?', [saleId]);

  for (const order of created) {
    broadcastKitchenEvent('order.sent_to_kitchen', {
      ...order,
      numero_pedido: saleId
    });
  }

  return created;
}

const requirePermission = (permission, message) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ message });
  }

  next();
};

const canManageSales = (user) => hasPermission(user, 'gerenciar_vendas');

const loadSalesHistory = async (connection, limit = 20) => {
  const normalizedLimit = Number.isInteger(limit) && limit > 0 ? limit : 20;
  const [sales] = await connection.query(`
    SELECT
      v.id,
      v.total,
      v.status,
      v.created_at,
      v.cancelado_em,
      u.nome AS usuario_nome,
      COALESCE(SUM(iv.quantidade), 0) AS quantidade_total
    FROM vendas v
    LEFT JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN itens_venda iv ON iv.venda_id = v.id
    GROUP BY v.id, v.total, v.status, v.created_at, v.cancelado_em, u.nome
    ORDER BY v.created_at DESC
    LIMIT ${normalizedLimit}
  `);

  const saleIds = sales.map((sale) => Number(sale.id));
  const itemsBySaleId = new Map();

  if (saleIds.length > 0) {
    const placeholders = saleIds.map(() => '?').join(', ');
    const [items] = await connection.query(
      `
        SELECT
          iv.id,
          iv.venda_id,
          iv.produto_id,
          iv.produto_nome,
          iv.categoria,
          iv.quantidade,
          iv.preco_unitario,
          iv.subtotal,
          iv.observacoes,
          iv.customization_summary,
          p.nome AS produto_atual_nome,
          p.categoria AS categoria_atual
        FROM itens_venda iv
        LEFT JOIN produtos p ON p.id = iv.produto_id
        WHERE iv.venda_id IN (${placeholders})
        ORDER BY iv.venda_id DESC, iv.id ASC
      `,
      saleIds
    );

    for (const item of items) {
      const saleId = Number(item.venda_id);
      const saleItems = itemsBySaleId.get(saleId) || [];

      saleItems.push({
        id: Number(item.id),
        produto_id: item.produto_id === null ? null : Number(item.produto_id),
        produto_nome: item.produto_nome || item.produto_atual_nome || `Produto #${item.produto_id}`,
        categoria: item.categoria || item.categoria_atual || null,
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco_unitario),
        subtotal: Number(item.subtotal),
        observacoes: item.observacoes || null,
        customization_summary: item.customization_summary || null
      });

      itemsBySaleId.set(saleId, saleItems);
    }
  }

  return sales.map((sale) => {
    const items = itemsBySaleId.get(Number(sale.id)) || [];

    return {
      id: Number(sale.id),
      total: Number(sale.total),
      status: sale.status,
      created_at: sale.created_at,
      cancelado_em: sale.cancelado_em,
      usuario_nome: sale.usuario_nome,
      quantidade: Number(sale.quantidade_total),
      quantidade_total: Number(sale.quantidade_total),
      produto_nome: items.length > 0
        ? items.map((item) => `${item.produto_nome} x${item.quantidade}`).join(', ')
        : 'Sem itens',
      itens: items
    };
  });
};

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: `${env.APP_NAME} API - Online!`, slogan: env.APP_SLOGAN });
});



app.get('/api/config', (req, res) => {
  res.json({
    tipo_negocio: businessType,
    perfil_negocio: businessProfiles[businessType],
    tipos_negocio: businessProfiles,
    permissoes: permissions,
    niveis_acesso: allowedAccessLevels,
    rotulos_niveis_acesso: roleLabels
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/produtos', productRoutes);
app.use('/api/caixa', cashRoutes);
app.use('/api/integrations/node-red', nodeRedRoutes);

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const connection = await db.getConnection();
    const [users] = await connection.query('SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE', [email]);
    connection.release();

    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(senha, user.senha);

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nome: user.nome, nivel_acesso: user.nivel_acesso },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, nivel_acesso: user.nivel_acesso } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// VERIFY TOKEN
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// GET USUARIOS
app.get('/api/auth/usuarios', authenticateToken, async (req, res) => {
  if (req.user.nivel_acesso !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT id, nome, email, nivel_acesso FROM usuarios WHERE ativo = TRUE');
    connection.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

// REGISTER
app.post('/api/auth/register', authenticateToken, async (req, res) => {
  if (req.user.nivel_acesso !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }

  try {
    const { nome, email, senha, nivel_acesso } = req.body;
    const normalizedName = nome?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const accessLevel = allowedAccessLevels.includes(nivel_acesso) ? nivel_acesso : 'vendedor';

    if (!normalizedName || !normalizedEmail || !senha) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const connection = await db.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO usuarios (nome, email, senha, nivel_acesso, ativo) VALUES (?, ?, ?, ?, TRUE)',
        [normalizedName, normalizedEmail, hashedPassword, accessLevel]
      );

      res.json({ id: result.insertId, nome: normalizedName, email: normalizedEmail, nivel_acesso: accessLevel });
    } finally {
      connection.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email já cadastrado.' });
    }

    res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
  }
});

// UPDATE USUARIO
app.put('/api/auth/usuarios/:id', authenticateToken, async (req, res) => {
  if (req.user.nivel_acesso !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }

  try {
    const { id } = req.params;
    const { nome, email, senha, nivel_acesso } = req.body;
    const normalizedName = nome?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const accessLevel = allowedAccessLevels.includes(nivel_acesso) ? nivel_acesso : null;

    if (!normalizedName || !normalizedEmail || !accessLevel) {
      return res.status(400).json({ message: 'Nome, email e nível de acesso são obrigatórios.' });
    }

    if (senha && senha.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
    }

    const connection = await db.getConnection();

    try {
      const params = [normalizedName, normalizedEmail, accessLevel];
      let sql = 'UPDATE usuarios SET nome = ?, email = ?, nivel_acesso = ?';

      if (senha) {
        const hashedPassword = await bcrypt.hash(senha, 10);
        sql += ', senha = ?';
        params.push(hashedPassword);
      }

      sql += ' WHERE id = ? AND ativo = TRUE';
      params.push(id);

      const [result] = await connection.query(sql, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      res.json({
        id: Number(id),
        nome: normalizedName,
        email: normalizedEmail,
        nivel_acesso: accessLevel,
        reauthRequired: Number(id) === Number(req.user.id)
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email já cadastrado.' });
    }

    res.status(500).json({ message: 'Erro ao atualizar usuário.' });
  }
});

// DELETE USUARIO
app.delete('/api/auth/usuarios/:id', authenticateToken, async (req, res) => {
  if (req.user.nivel_acesso !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });
  }

  if (Number(req.params.id) === Number(req.user.id)) {
    return res.status(400).json({ message: 'Não é permitido excluir o próprio usuário.' });
  }

  try {
    const connection = await db.getConnection();

    try {
      const [result] = await connection.query(
        'UPDATE usuarios SET ativo = FALSE WHERE id = ? AND ativo = TRUE',
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado.' });
      }

      res.json({ message: 'Usuário excluído com sucesso.' });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir usuário.' });
  }
});

// GET PRODUTOS
app.get('/api/produtos', authenticateToken, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const includeIngredients = req.query.include_ingredients === 'true';
    const [rows] = await connection.query(
      businessType === 'fast_food'
        ? includeIngredients
          ? "SELECT * FROM produtos WHERE business_type = 'fast_food' AND (ativo = TRUE OR tipo = 'ingrediente') ORDER BY categoria ASC, nome ASC"
          : "SELECT * FROM produtos WHERE ativo = TRUE AND business_type = 'fast_food' ORDER BY categoria ASC, nome ASC"
        : 'SELECT * FROM produtos ORDER BY nome ASC'
    );
    connection.release();
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

// CREATE PRODUTO
app.post(
  '/api/produtos',
  authenticateToken,
  requirePermission('gerenciar_produtos', 'Acesso negado. Apenas administrador, gerente ou estoquista podem alterar estoque.'),
  async (req, res) => {
  try {
    const { payload, error } = parseProductPayload(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const { nome, descricao, categoria, codigo_barras, tipo, preco, custo, extra_price, quantidade, estoque_minimo, unidade, ativo, estacao_cozinha } = payload;

    const connection = await db.getConnection();
    try {
      const [result] = await connection.query(
        `
          INSERT INTO produtos (
            nome, descricao, categoria, codigo_barras, tipo, preco, custo, extra_price, quantidade,
            estoque_minimo, unidade, ativo, estacao_cozinha, preparation_station, business_type
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [nome, descricao, categoria, codigo_barras, tipo, preco, custo, extra_price, quantidade, estoque_minimo, unidade, ativo, estacao_cozinha, estacao_cozinha, businessType]
      );
      await audit(connection, req.user.id, 'produto.criado', 'produtos', result.insertId, payload);
      res.json({ id: result.insertId, ...payload });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json(err);
  }
  }
);

// UPDATE PRODUTO
app.put(
  '/api/produtos/:id',
  authenticateToken,
  requirePermission('gerenciar_produtos', 'Acesso negado. Apenas administrador, gerente ou estoquista podem alterar estoque.'),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { payload, error } = parseProductPayload(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const { nome, descricao, categoria, codigo_barras, tipo, preco, custo, extra_price, quantidade, estoque_minimo, unidade, ativo, estacao_cozinha } = payload;

    const connection = await db.getConnection();
    try {
      await connection.query(
        `
          UPDATE produtos
          SET nome=?, descricao=?, categoria=?, codigo_barras=?, tipo=?, preco=?, custo=?, extra_price=?, quantidade=?,
              estoque_minimo=?, unidade=?, ativo=?, estacao_cozinha=?, preparation_station=?
          WHERE id=?
        `,
        [nome, descricao, categoria, codigo_barras, tipo, preco, custo, extra_price, quantidade, estoque_minimo, unidade, ativo, estacao_cozinha, estacao_cozinha, id]
      );
      await audit(connection, req.user.id, 'produto.alterado', 'produtos', Number(id), payload);
      res.json({ message: 'Atualizado com sucesso', produto: { id: Number(id), ...payload } });
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json(err);
  }
  }
);

// DELETE PRODUTO
app.delete(
  '/api/produtos/:id',
  authenticateToken,
  requirePermission('gerenciar_produtos', 'Acesso negado. Apenas administrador, gerente ou estoquista podem alterar estoque.'),
  async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ message: 'Produto inválido.' });
  }

  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [products] = await connection.query(
      'SELECT id, nome, categoria FROM produtos WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const product = products[0];

    await connection.query(
      `
        UPDATE itens_venda
        SET
          produto_nome = COALESCE(produto_nome, ?),
          categoria = COALESCE(categoria, ?),
          produto_id = NULL
        WHERE produto_id = ?
      `,
      [product.nome, product.categoria, productId]
    );

    await connection.query('DELETE FROM produtos WHERE id = ?', [productId]);
    await connection.commit();

    res.json({ message: 'Produto deletado com sucesso' });
  } catch (err) {
    if (transactionStarted) {
      await connection.rollback().catch(() => null);
    }

    console.error(err);
    res.status(500).json({ message: 'Erro ao deletar produto.' });
  } finally {
    connection.release();
  }
}
);

// CREATE VENDA
app.post(
  '/api/vendas',
  authenticateToken,
  requirePermission('realizar_venda', 'Acesso negado. Apenas administrador, gerente ou vendedor podem realizar venda.'),
  async (req, res) => {
  const { payload, error } = parseSalePayload(req.body);

  if (error) {
    return res.status(400).json({ message: error });
  }

  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;
    const cash = await ensureOpenCashIfRequired(connection, req.user.id);
    await ensureCashCanSell(connection, cash);

    if (!Number.isFinite(payload.desconto) || payload.desconto < 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Desconto inválido.' });
    }

    const discountLimit = Number(await getSetting(connection, 'limite_desconto', '50'));
    if (payload.desconto > discountLimit && !hasPermission(req.user, 'aplicar_desconto')) {
      await connection.rollback();
      return res.status(403).json({ message: 'Desconto acima do limite permitido para este usuário.' });
    }

    const productIds = [...new Set(payload.items.map((item) => item.produtoId))];
    const placeholders = productIds.map(() => '?').join(', ');
    const [produtos] = await connection.query(
      `
        SELECT
          p.id, p.nome, p.categoria, p.tipo, p.preco, p.custo, p.quantidade, p.validade,
          p.permite_venda_vencido, p.estacao_cozinha, p.preparation_station,
          dm.controlado, dm.exige_receita, dm.tarja
        FROM produtos p
        LEFT JOIN detalhes_medicamento dm ON dm.produto_id = p.id
        WHERE p.id IN (${placeholders}) AND p.ativo = TRUE
        FOR UPDATE
      `,
      productIds
    );

    if (produtos.length !== productIds.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    const productMap = new Map(produtos.map((produto) => [Number(produto.id), produto]));
    const itensVenda = [];
    let total = 0;

    for (const item of payload.items) {
      const produto = productMap.get(item.produtoId);

      if (!produto) {
        await connection.rollback();
        return res.status(404).json({ message: 'Produto não encontrado.' });
      }

      if (businessType === 'pharmacy' && (produto.controlado || produto.exige_receita) && !payload.receitaMedica) {
        await connection.rollback();
        return res.status(400).json({ message: `Medicamento controlado exige receita: ${produto.nome}` });
      }

      if (produto.validade && new Date(produto.validade) < new Date() && !produto.permite_venda_vencido) {
        await connection.rollback();
        return res.status(400).json({ message: `Produto vencido bloqueado para venda: ${produto.nome}` });
      }

      const customizationData = await prepareSaleItemCustomization(connection, produto, item.customizations);
      const precoBase = Number(produto.preco);
      const precoUnitario = Number((precoBase + customizationData.unitPriceDelta).toFixed(2));
      const subtotal = Number((precoUnitario * item.quantidade).toFixed(2));
      total += subtotal;
      const produtoNome = customizationData.summary ? `${produto.nome} (${customizationData.summary})` : produto.nome;

      itensVenda.push({
        produtoId: produto.id,
        produtoNome,
        categoria: produto.categoria,
        tipo: produto.tipo,
        station: resolveKitchenStation(produto),
        quantidade: item.quantidade,
        precoBase,
        precoUnitario,
        subtotal,
        customizations: customizationData.customizations,
        customizationSummary: customizationData.summary,
        observacoes: customizationData.summary || null,
        stockOptions: customizationData.stockOptions
      });
    }

    const subtotalVenda = Number(total.toFixed(2));
    total = Number(Math.max(0, subtotalVenda - payload.desconto).toFixed(2));
    const normalizedPayments = normalizeSalePayments(payload, total);
    if (normalizedPayments.error) {
      await connection.rollback();
      return res.status(400).json({ message: normalizedPayments.error });
    }
    const hasPendingPayment = normalizedPayments.payments.some((payment) => payment.status === 'pending');
    const saleStatus = hasPendingPayment ? 'aguardando_pagamento' : 'finalizada';
    const orderChannel = channelMap[payload.canal] || payload.canal;

    const [vendaResult] = await connection.query(
      `
        INSERT INTO vendas (
          usuario_id, numero_pedido, canal, order_channel, caixa_id, total, subtotal, desconto, forma_pagamento, status, paid_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${hasPendingPayment ? 'NULL' : 'CURRENT_TIMESTAMP'})
      `,
      [req.user.id, null, payload.canal, orderChannel, cash?.id || null, total, subtotalVenda, payload.desconto, payload.formaPagamento, saleStatus]
    );
    await connection.query('UPDATE vendas SET numero_pedido = ? WHERE id = ?', [vendaResult.insertId, vendaResult.insertId]);

    for (const item of itensVenda) {
      const [itemResult] = await connection.query(
        `
          INSERT INTO itens_venda (
            venda_id,
            produto_id,
            produto_nome,
            categoria,
            quantidade,
            preco_unitario,
            preco_base,
            subtotal,
            observacoes,
            customization_summary,
            item_status,
            status_preparo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          vendaResult.insertId,
          item.produtoId,
          item.produtoNome,
          item.categoria,
          item.quantidade,
          item.precoUnitario,
          item.precoBase,
          item.subtotal,
          item.observacoes,
          item.customizationSummary,
          hasPendingPayment ? 'pending_payment' : 'pending',
          hasPendingPayment ? 'aguardando_pagamento' : 'recebido'
        ]
      );
      item.id = itemResult.insertId;

      for (const customization of item.customizations) {
        await connection.query(
          `
            INSERT INTO order_item_customizations (
              order_item_id,
              ingrediente_id,
              type,
              quantity,
              price_delta
            ) VALUES (?, ?, ?, ?, ?)
          `,
          [item.id, customization.ingredienteId, customization.type, customization.quantity, customization.priceDelta]
        );
      }
    }

    const paymentResponses = [];
    for (const payment of normalizedPayments.payments) {
      const [paymentResult] = await connection.query(
        `
          INSERT INTO pagamentos (
            venda_id, caixa_id, metodo, valor, troco, valor_recebido, status, provider, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${payment.metodo === 'pix' ? `DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${PIX_EXPIRES_MINUTES} MINUTE)` : 'NULL'})
        `,
        [
          vendaResult.insertId,
          cash?.id || null,
          payment.metodo,
          payment.valor,
          payment.troco,
          payment.valor_recebido,
          payment.status,
          payment.metodo.startsWith('card') || payment.metodo === 'voucher' ? env.CARD_PROVIDER : null
        ]
      );

      let pixPayload = null;
      if (payment.metodo === 'pix') {
        pixPayload = buildPixPayload(paymentResult.insertId);
        await connection.query(
          'UPDATE pagamentos SET qr_code = ?, pix_code = ? WHERE id = ?',
          [pixPayload.qr_code, pixPayload.pix_code, paymentResult.insertId]
        );
      }

      if (payment.metodo.startsWith('card') || payment.metodo === 'voucher') {
        await connection.query(
          `
            INSERT INTO card_transactions (
              payment_id, order_id, cash_register_id, operator_id, provider, transaction_id,
              amount, method, status, raw_request, raw_response, requested_at, approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `,
          [
            paymentResult.insertId,
            vendaResult.insertId,
            cash?.id || null,
            req.user.id,
            env.CARD_PROVIDER,
            `sandbox_${paymentResult.insertId}`,
            payment.valor,
            payment.metodo,
            payment.sandbox_result,
            JSON.stringify({ mode: env.CARD_PROVIDER_MODE, amount: payment.valor }),
            JSON.stringify({ approved: payment.sandbox_result === 'approved' })
          ]
        );
      }

      paymentResponses.push({
        id: paymentResult.insertId,
        metodo: payment.metodo,
        valor: payment.valor,
        status: payment.status,
        troco: payment.troco,
        expires_in_minutes: payment.metodo === 'pix' ? PIX_EXPIRES_MINUTES : null,
        ...pixPayload
      });
    }

    if (cash) {
      const cashDelta = normalizedPayments.payments
        .filter((payment) => payment.metodo === 'cash' && payment.status === 'approved')
        .reduce((sum, payment) => sum + payment.valor, 0);
      if (cashDelta > 0) {
        await connection.query('UPDATE caixas SET valor_esperado = valor_esperado + ? WHERE id = ?', [cashDelta, cash.id]);
      }
    }

    if (businessType === 'pharmacy' && payload.receitaMedica) {
      await connection.query(
        `
          INSERT INTO receitas_medicas (
            cliente_id, paciente_nome, paciente_cpf, medico_nome, medico_crm,
            data_receita, tipo_receita, arquivo_url, venda_id, usuario_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          payload.clienteId,
          payload.receitaMedica.paciente_nome,
          payload.receitaMedica.paciente_cpf || null,
          payload.receitaMedica.medico_nome,
          payload.receitaMedica.medico_crm,
          payload.receitaMedica.data_receita,
          payload.receitaMedica.tipo_receita || 'controlado',
          payload.receitaMedica.arquivo_url || null,
          vendaResult.insertId,
          req.user.id
        ]
      );
    }

    if (!hasPendingPayment) {
      await consumeSaleStock(connection, vendaResult.insertId, req.user.id);
      await sendSaleToKitchen(
        connection,
        vendaResult.insertId,
        itensVenda.map((item) => ({
          id: item.id,
          produto_id: item.produtoId,
          produto_nome: item.produtoNome,
          categoria: item.categoria,
          tipo: item.tipo,
          station: item.station
        }))
      );
      broadcastKitchenEvent('order.paid', { order_id: vendaResult.insertId, total });
    }

    await audit(connection, req.user.id, 'venda.finalizada', 'vendas', vendaResult.insertId, {
      itens: itensVenda,
      total,
      forma_pagamento: payload.formaPagamento,
      desconto: payload.desconto,
      pagamentos: paymentResponses
    });

    await connection.commit();

    res.status(201).json({
      message: 'Venda realizada com sucesso.',
      venda: {
        id: vendaResult.insertId,
        numero_pedido: vendaResult.insertId,
        status: saleStatus,
        itens: itensVenda,
        quantidade_total: itensVenda.reduce((sum, item) => sum + item.quantidade, 0),
        subtotal: subtotalVenda,
        desconto: payload.desconto,
        total,
        forma_pagamento: payload.formaPagamento,
        pagamentos: paymentResponses,
        pix: paymentResponses.find((payment) => payment.metodo === 'pix') || null,
        alertas_caixa: cash ? await getCashAlerts(connection, cash.id) : []
      }
    });
  } catch (err) {
    if (transactionStarted) {
      await connection.rollback().catch(() => null);
    }

    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Erro ao registrar venda.' });
  } finally {
    connection.release();
  }
}
);

// DASHBOARD
app.get(
  '/api/dashboard',
  authenticateToken,
  requirePermission('ver_dashboard', 'Acesso negado. Apenas administrador, gerente ou estoquista podem acessar relatórios.'),
  async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [produtos] = await connection.query('SELECT COUNT(*) as total FROM produtos WHERE ativo = TRUE');
    const [vendas] = await connection.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as receita
      FROM vendas
      WHERE status <> 'cancelada'
    `);
    const [vendasDia] = await connection.query(`
      SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as receita
      FROM vendas
      WHERE status <> 'cancelada'
        AND DATE(created_at) = CURDATE()
    `);
    const [baixoEstoque] = await connection.query('SELECT * FROM produtos WHERE ativo = TRUE AND quantidade <= estoque_minimo');
    const [maisVendidos] = await connection.query(`
      SELECT produto_nome, SUM(iv.quantidade) AS quantidade, SUM(iv.subtotal) AS total
      FROM itens_venda iv
      JOIN vendas v ON v.id = iv.venda_id
      WHERE v.status <> 'cancelada'
      GROUP BY produto_nome
      ORDER BY quantidade DESC
      LIMIT 5
    `);
    const [lucro] = await connection.query(`
      SELECT COALESCE(SUM(iv.subtotal - (COALESCE(p.custo, 0) * iv.quantidade)), 0) AS lucro_estimado
      FROM itens_venda iv
      JOIN vendas v ON v.id = iv.venda_id
      LEFT JOIN produtos p ON p.id = iv.produto_id
      WHERE v.status <> 'cancelada'
    `);
    connection.release();

    res.json({
      total_produtos: produtos[0].total,
      total_vendas: vendas[0].total || 0,
      receita_total: vendas[0].receita || 0,
      vendas_dia: vendasDia[0].total || 0,
      receita_dia: vendasDia[0].receita || 0,
      baixo_estoque: baixoEstoque,
      produtos_mais_vendidos: maisVendidos,
      lucro_estimado: lucro[0].lucro_estimado || 0
    });
  } catch (err) {
    res.status(500).json(err);
  }
}
);

// VENDAS
app.get('/api/vendas', authenticateToken, async (req, res) => {
  if (!canManageSales(req.user)) {
    return res.status(403).json({ message: 'Acesso negado. Apenas gerente ou administrador.' });
  }

  try {
    const connection = await db.getConnection();
    try {
      const rows = await loadSalesHistory(connection, 20);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

app.patch('/api/vendas/:id/cancelar', authenticateToken, async (req, res) => {
  if (!canManageSales(req.user)) {
    return res.status(403).json({ message: 'Acesso negado. Apenas gerente ou administrador.' });
  }

  const saleId = Number(req.params.id);

  if (!Number.isInteger(saleId) || saleId <= 0) {
    return res.status(400).json({ message: 'Venda inválida.' });
  }

  const connection = await db.getConnection();
  let transactionStarted = false;
  const motivo = String(req.body?.motivo || '').trim();

  if (!motivo) {
    connection.release();
    return res.status(400).json({ message: 'Informe o motivo do cancelamento.' });
  }

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [sales] = await connection.query(
      'SELECT id, status, total, caixa_id FROM vendas WHERE id = ? FOR UPDATE',
      [saleId]
    );

    if (sales.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }

    if (sales[0].status === 'cancelada') {
      await connection.rollback();
      return res.status(400).json({ message: 'A venda já está cancelada.' });
    }

    const [movements] = await connection.query(
      "SELECT produto_id, quantidade FROM movimentacoes_estoque WHERE venda_id = ? AND tipo = 'venda'",
      [saleId]
    );

    if (movements.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'A venda não possui itens para cancelamento.' });
    }

    const productIds = [...new Set(movements.map((item) => Number(item.produto_id)))];
    const placeholders = productIds.map(() => '?').join(', ');
    const [products] = await connection.query(
      `SELECT id FROM produtos WHERE id IN (${placeholders}) FOR UPDATE`,
      productIds
    );

    if (products.length !== productIds.length) {
      await connection.rollback();
      return res.status(409).json({
        message: 'Não foi possível cancelar a venda porque um ou mais produtos não existem mais no estoque.'
      });
    }

    for (const item of movements) {
      const quantityToReturn = Math.abs(Number(item.quantidade));
      await connection.query(
        'UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?',
        [quantityToReturn, item.produto_id]
      );
      await registerStockMovement(connection, {
        produtoId: item.produto_id,
        vendaId: saleId,
        usuarioId: req.user.id,
        tipo: 'cancelamento',
        quantidade: quantityToReturn,
        motivo: 'Cancelamento de venda'
      });
    }

    await connection.query(
      "UPDATE vendas SET status = 'cancelada', cancelado_em = CURRENT_TIMESTAMP WHERE id = ?",
      [saleId]
    );

    await connection.query(
      'INSERT INTO order_cancellations (order_id, operador_id, motivo) VALUES (?, ?, ?)',
      [saleId, req.user.id, motivo]
    );

    if (sales[0].caixa_id) {
      await connection.query(
        'UPDATE caixas SET valor_esperado = valor_esperado - ? WHERE id = ? AND status = ?',
        [Number(sales[0].total), sales[0].caixa_id, 'aberto']
      );
    }

    await connection.query(
      "UPDATE pagamentos SET status = 'cancelado' WHERE venda_id = ?",
      [saleId]
    );

    await connection.query(
      "UPDATE pedidos_cozinha SET status = 'cancelado' WHERE venda_id = ? AND status <> 'entregue'",
      [saleId]
    );

    await audit(connection, req.user.id, 'venda.cancelada', 'vendas', saleId, { motivo });

    await connection.commit();

    res.json({
      message: 'Venda cancelada com sucesso.',
      venda: {
        id: saleId,
        status: 'cancelada'
      }
    });
  } catch (err) {
    if (transactionStarted) {
      await connection.rollback().catch(() => null);
    }

    console.error(err);
    res.status(500).json({ message: 'Erro ao cancelar venda.' });
  } finally {
    connection.release();
  }
});

app.get('/api/caixa/aberto', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const cash = await getOpenCash(connection, req.user.id);
    if (!cash) return res.json(null);
    const summary = await getCashSummary(connection, cash.id);
    const alertas = await getCashAlerts(connection, cash.id);
    res.json({ ...cash, resumo: summary, alertas });
  } finally {
    connection.release();
  }
});

app.post('/api/caixa/abrir', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado para abrir caixa.'), async (req, res) => {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const existing = await getOpenCash(connection, req.user.id);
    if (existing) {
      await connection.rollback();
      return res.status(400).json({ message: 'Este operador já possui caixa aberto.' });
    }

    const valor = Number(req.body.valor_abertura || 0);
    const [result] = await connection.query(
      'INSERT INTO caixas (usuario_abertura_id, valor_abertura, valor_esperado) VALUES (?, ?, ?)',
      [req.user.id, valor, valor]
    );
    await audit(connection, req.user.id, 'caixa.aberto', 'caixas', result.insertId, { valor_abertura: valor });
    await connection.commit();
    res.status(201).json({ id: result.insertId, status: 'aberto', valor_abertura: valor, valor_esperado: valor });
  } catch (err) {
    if (transactionStarted) await connection.rollback().catch(() => null);
    res.status(500).json({ message: 'Erro ao abrir caixa.' });
  } finally {
    connection.release();
  }
});

app.post('/api/caixa/movimento', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado para movimentar caixa.'), async (req, res) => {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const cash = await getOpenCash(connection, req.user.id);
    if (!cash) {
      await connection.rollback();
      return res.status(400).json({ message: 'Nenhum caixa aberto.' });
    }

    const tipo = String(req.body.tipo || 'suprimento');
    const observacao = String(req.body.observacao || req.body.motivo || '').trim();
    const valor = Number(req.body.valor || 0);
    if (!Number.isFinite(valor) || valor <= 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Valor inválido.' });
    }
    if (['sangria', 'suprimento'].includes(tipo) && !observacao) {
      await connection.rollback();
      return res.status(400).json({ message: 'Motivo obrigatório.' });
    }
    if (tipo === 'despesa' && !observacao) {
      await connection.rollback();
      return res.status(400).json({ message: 'Descrição da despesa é obrigatória.' });
    }

    const delta = ['sangria', 'despesa'].includes(tipo) ? -Math.abs(valor) : Math.abs(valor);
    const [result] = await connection.query(
      'INSERT INTO caixa_movimentos (caixa_id, usuario_id, tipo, valor, observacao) VALUES (?, ?, ?, ?, ?)',
      [cash.id, req.user.id, tipo, valor, observacao || null]
    );
    await connection.query('UPDATE caixas SET valor_esperado = valor_esperado + ? WHERE id = ?', [delta, cash.id]);
    await audit(connection, req.user.id, `caixa.${tipo}`, 'caixa_movimentos', result.insertId, { valor });
    const alertas = await getCashAlerts(connection, cash.id);
    broadcastKitchenEvent('cash.alert', { caixa_id: cash.id, alertas });
    await connection.commit();
    res.status(201).json({ id: result.insertId, caixa_id: cash.id, tipo, valor, alertas });
  } catch (err) {
    if (transactionStarted) await connection.rollback().catch(() => null);
    res.status(500).json({ message: 'Erro ao registrar movimento.' });
  } finally {
    connection.release();
  }
});

app.post('/api/caixa/fechar', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado para fechar caixa.'), async (req, res) => {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const cash = await getOpenCash(connection, req.user.id);
    if (!cash) {
      await connection.rollback();
      return res.status(400).json({ message: 'Nenhum caixa aberto.' });
    }
    const declarado = Number(req.body.valor_declarado || 0);
    const summary = await getCashSummary(connection, cash.id);
    const diferenca = Number((declarado - Number(summary.valor_esperado_dinheiro)).toFixed(2));
    const justificativa = String(req.body.justificativa_diferenca || '').trim();
    if (diferenca !== 0 && !justificativa) {
      await connection.rollback();
      return res.status(400).json({ message: 'Diferença no fechamento exige justificativa.' });
    }
    await connection.query(
      `
        UPDATE caixas
        SET status='fechado', usuario_fechamento_id=?, valor_declarado=?, diferenca=?, justificativa_diferenca=?, observacao=?, fechado_em=CURRENT_TIMESTAMP
        WHERE id=? AND status='aberto'
      `,
      [req.user.id, declarado, diferenca, justificativa || null, req.body.observacao || null, cash.id]
    );
    await audit(connection, req.user.id, 'caixa.fechado', 'caixas', cash.id, { valor_declarado: declarado, diferenca });
    await connection.commit();
    res.json({ id: cash.id, status: 'fechado', valor_declarado: declarado, diferenca, resumo: summary });
  } catch (err) {
    if (transactionStarted) await connection.rollback().catch(() => null);
    res.status(500).json({ message: 'Erro ao fechar caixa.' });
  } finally {
    connection.release();
  }
});

app.post('/api/payments/pix/:paymentId/approve', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [payments] = await connection.query('SELECT * FROM pagamentos WHERE id = ? FOR UPDATE', [req.params.paymentId]);
    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pagamento não encontrado.' });
    }

    const payment = payments[0];
    if (
      payment.metodo === 'pix' &&
      payment.status === 'pending' &&
      payment.expires_at &&
      new Date(payment.expires_at).getTime() < Date.now()
    ) {
      await connection.query("UPDATE pagamentos SET status = 'expired', expired_at = CURRENT_TIMESTAMP WHERE id = ?", [payment.id]);
      await connection.query("UPDATE vendas SET status = 'pix_expired', cancelado_em = CURRENT_TIMESTAMP WHERE id = ? AND status = 'aguardando_pagamento'", [payment.venda_id]);
      await audit(connection, req.user.id, 'pagamento.pix_expirado', 'pagamentos', payment.id, { venda_id: payment.venda_id });
      await connection.commit();
      return res.status(400).json({ message: 'Pix expirado. Gere uma nova venda para continuar.' });
    }

    await connection.query("UPDATE pagamentos SET status = 'approved' WHERE id = ?", [payment.id]);

    const [[pending]] = await connection.query(
      "SELECT COUNT(*) AS total FROM pagamentos WHERE venda_id = ? AND status IN ('pending','processing')",
      [payment.venda_id]
    );

    if (Number(pending.total) === 0) {
      await connection.query("UPDATE vendas SET status = 'finalizada', paid_at = COALESCE(paid_at, CURRENT_TIMESTAMP) WHERE id = ?", [payment.venda_id]);
      await consumeSaleStock(connection, payment.venda_id, req.user.id);
      await sendSaleToKitchen(connection, payment.venda_id);
    }

    await audit(connection, req.user.id, 'pagamento.pix_aprovado', 'pagamentos', payment.id, { venda_id: payment.venda_id });
    broadcastKitchenEvent('payment.status_changed', { payment_id: payment.id, order_id: payment.venda_id, status: 'approved' });
    await connection.commit();
    res.json({ id: payment.id, venda_id: payment.venda_id, status: 'approved' });
  } catch (err) {
    if (transactionStarted) await connection.rollback().catch(() => null);
    res.status(500).json({ message: 'Erro ao aprovar Pix.' });
  } finally {
    connection.release();
  }
});

app.post('/api/card-terminals', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [result] = await connection.query(
      'INSERT INTO card_terminals (store_id, name, provider, terminal_id, serial_number, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.body.store_id || null, req.body.name, req.body.provider || env.CARD_PROVIDER, req.body.terminal_id || null, req.body.serial_number || null, req.body.status || 'active']
    );
    await audit(connection, req.user.id, 'terminal_cartao.criado', 'card_terminals', result.insertId, req.body);
    res.status(201).json({ id: result.insertId });
  } finally {
    connection.release();
  }
});

app.get('/api/card-terminals', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM card_terminals ORDER BY name ASC');
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.patch('/api/card-terminals/:id', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query(
      'UPDATE card_terminals SET name = COALESCE(?, name), provider = COALESCE(?, provider), terminal_id = COALESCE(?, terminal_id), serial_number = COALESCE(?, serial_number), status = COALESCE(?, status), last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.body.name || null, req.body.provider || null, req.body.terminal_id || null, req.body.serial_number || null, req.body.status || null, req.params.id]
    );
    await audit(connection, req.user.id, 'terminal_cartao.alterado', 'card_terminals', Number(req.params.id), req.body);
    res.json({ id: Number(req.params.id), ...req.body });
  } finally {
    connection.release();
  }
});

app.post('/api/payments/card-terminal/start', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const amount = Number(req.body.amount || req.body.valor || 0);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Valor inválido.' });

    const statusByScenario = {
      approve: 'approved',
      approved: 'approved',
      decline: 'declined',
      declined: 'declined',
      timeout: 'timeout',
      cancel: 'cancelled',
      cancelled: 'cancelled'
    };
    const status = statusByScenario[String(req.body.sandbox_result || 'approved')] || 'approved';
    const [paymentResult] = await connection.query(
      'INSERT INTO pagamentos (venda_id, caixa_id, metodo, valor, status, provider) VALUES (?, ?, ?, ?, ?, ?)',
      [req.body.order_id || req.body.venda_id || 0, req.body.cash_register_id || null, normalizePaymentMethod(req.body.method || 'card_credit'), amount, status === 'approved' ? 'approved' : 'pending', env.CARD_PROVIDER]
    );
    const [transactionResult] = await connection.query(
      `
        INSERT INTO card_transactions (
          payment_id, order_id, cash_register_id, operator_id, card_terminal_id, provider,
          terminal_id, transaction_id, amount, method, status, raw_request, raw_response, requested_at, approved_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ${status === 'approved' ? 'CURRENT_TIMESTAMP' : 'NULL'}, ${status === 'cancelled' ? 'CURRENT_TIMESTAMP' : 'NULL'})
      `,
      [
        paymentResult.insertId,
        req.body.order_id || req.body.venda_id || null,
        req.body.cash_register_id || null,
        req.user.id,
        req.body.card_terminal_id || null,
        env.CARD_PROVIDER,
        req.body.terminal_id || null,
        `sandbox_${Date.now()}`,
        amount,
        normalizePaymentMethod(req.body.method || 'card_credit'),
        status,
        JSON.stringify(req.body),
        JSON.stringify({ mode: env.CARD_PROVIDER_MODE, status })
      ]
    );
    await audit(connection, req.user.id, `pagamento_cartao.${status}`, 'card_transactions', transactionResult.insertId, req.body);
    broadcastKitchenEvent('payment.status_changed', { payment_id: paymentResult.insertId, status });
    res.status(201).json({ payment_id: paymentResult.insertId, transaction_id: transactionResult.insertId, status });
  } finally {
    connection.release();
  }
});

app.get('/api/payments/card-terminal/:paymentId/status', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM card_transactions WHERE payment_id = ? ORDER BY created_at DESC LIMIT 1', [req.params.paymentId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Transação não encontrada.' });
    res.json(rows[0]);
  } finally {
    connection.release();
  }
});

app.post('/api/payments/card-terminal/:paymentId/cancel', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query("UPDATE card_transactions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE payment_id = ?", [req.params.paymentId]);
    await connection.query("UPDATE pagamentos SET status = 'cancelled' WHERE id = ?", [req.params.paymentId]);
    await audit(connection, req.user.id, 'pagamento_cartao.cancelado', 'pagamentos', Number(req.params.paymentId));
    res.json({ payment_id: Number(req.params.paymentId), status: 'cancelled' });
  } finally {
    connection.release();
  }
});

app.post('/api/payments/card-terminal/:paymentId/refund', authenticateToken, requirePermission('gerenciar_vendas', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query("UPDATE card_transactions SET status = 'reversed' WHERE payment_id = ?", [req.params.paymentId]);
    await connection.query("UPDATE pagamentos SET status = 'refunded' WHERE id = ?", [req.params.paymentId]);
    await audit(connection, req.user.id, 'pagamento_cartao.estornado', 'pagamentos', Number(req.params.paymentId));
    res.json({ payment_id: Number(req.params.paymentId), status: 'reversed' });
  } finally {
    connection.release();
  }
});

app.post('/api/payments/card-terminal/webhook', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query(
      'UPDATE card_transactions SET status = ?, raw_response = ?, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
      [req.body.status || 'processing', JSON.stringify(req.body), req.body.transaction_id]
    );
    broadcastKitchenEvent('payment.status_changed', req.body);
    res.json({ received: true });
  } finally {
    connection.release();
  }
});

app.post('/api/marketplace/webhook/ifood', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const externalId = req.body.id || req.body.order_id || `ifood_mock_${Date.now()}`;
    const [result] = await connection.query(
      'INSERT INTO marketplace_orders (provider, external_id, status, payload) VALUES (?, ?, ?, ?)',
      ['ifood_mock', externalId, 'received', JSON.stringify(req.body)]
    );
    broadcastKitchenEvent('order.created', { marketplace_order_id: result.insertId, provider: 'ifood_mock', status: 'received' });
    res.status(201).json({ id: result.insertId, provider: 'ifood_mock', external_id: externalId, status: 'received' });
  } finally {
    connection.release();
  }
});

app.get('/api/marketplace/orders', authenticateToken, requirePermission('gerenciar_delivery', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM marketplace_orders ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.post('/api/marketplace/orders/:id/accept', authenticateToken, requirePermission('gerenciar_delivery', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query("UPDATE marketplace_orders SET status = 'accepted' WHERE id = ?", [req.params.id]);
    await audit(connection, req.user.id, 'marketplace.pedido_aceito', 'marketplace_orders', Number(req.params.id), req.body);
    broadcastKitchenEvent('delivery.status_changed', { marketplace_order_id: Number(req.params.id), status: 'accepted' });
    res.json({ id: Number(req.params.id), status: 'accepted' });
  } finally {
    connection.release();
  }
});

app.post('/api/marketplace/orders/:id/reject', authenticateToken, requirePermission('gerenciar_delivery', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query("UPDATE marketplace_orders SET status = 'rejected' WHERE id = ?", [req.params.id]);
    await audit(connection, req.user.id, 'marketplace.pedido_recusado', 'marketplace_orders', Number(req.params.id), req.body);
    broadcastKitchenEvent('delivery.status_changed', { marketplace_order_id: Number(req.params.id), status: 'rejected' });
    res.json({ id: Number(req.params.id), status: 'rejected' });
  } finally {
    connection.release();
  }
});

app.patch('/api/marketplace/orders/:id/status', authenticateToken, requirePermission('gerenciar_delivery', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const status = String(req.body.status || 'received');
    await connection.query('UPDATE marketplace_orders SET status = ? WHERE id = ?', [status, req.params.id]);
    await audit(connection, req.user.id, 'marketplace.status_alterado', 'marketplace_orders', Number(req.params.id), { status });
    broadcastKitchenEvent('delivery.status_changed', { marketplace_order_id: Number(req.params.id), status });
    res.json({ id: Number(req.params.id), status });
  } finally {
    connection.release();
  }
});

app.get('/api/expedicao/pedidos', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT v.id, v.numero_pedido, v.canal, v.status, v.created_at, COUNT(koi.id) AS itens,
        SUM(koi.status IN ('ready','finished','checked')) AS itens_prontos
      FROM vendas v
      LEFT JOIN kitchen_order_items koi ON koi.order_id = v.id
      WHERE v.status IN ('finalizada','preparing','ready','sent_to_kitchen')
      GROUP BY v.id
      ORDER BY v.created_at ASC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.patch('/api/expedicao/pedidos/:id/pronto', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query("UPDATE vendas SET status = 'ready', ready_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    await connection.query(
      "INSERT INTO customer_display_queue (order_id, order_number, display_status, called_at) VALUES (?, ?, 'ready_for_pickup', CURRENT_TIMESTAMP)",
      [req.params.id, req.params.id]
    );
    await audit(connection, req.user.id, 'pedido.pronto', 'vendas', Number(req.params.id));
    broadcastKitchenEvent('order.ready', { order_id: Number(req.params.id), order_number: Number(req.params.id) });
    res.json({ id: Number(req.params.id), status: 'ready' });
  } finally {
    connection.release();
  }
});

app.get('/api/painel-cliente', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT cdq.*, v.canal
      FROM customer_display_queue cdq
      JOIN vendas v ON v.id = cdq.order_id
      WHERE cdq.completed_at IS NULL
      ORDER BY cdq.created_at DESC
      LIMIT 50
    `);
    res.json({
      preparando: rows.filter((row) => row.display_status === 'preparing'),
      pronto_para_retirada: rows.filter((row) => row.display_status === 'ready_for_pickup')
    });
  } finally {
    connection.release();
  }
});

app.get('/api/fornecedores', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM fornecedores ORDER BY nome ASC');
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.post('/api/fornecedores', authenticateToken, requirePermission('gerenciar_estoque', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [result] = await connection.query(
      'INSERT INTO fornecedores (nome, cnpj, telefone, email, endereco, laboratorio) VALUES (?, ?, ?, ?, ?, ?)',
      [req.body.nome, req.body.cnpj || null, req.body.telefone || null, req.body.email || null, req.body.endereco || null, Boolean(req.body.laboratorio)]
    );
    await audit(connection, req.user.id, 'fornecedor.criado', 'fornecedores', result.insertId, req.body);
    res.status(201).json({ id: result.insertId });
  } finally {
    connection.release();
  }
});

app.post('/api/compras', authenticateToken, requirePermission('gerenciar_estoque', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
    if (itens.length === 0) return res.status(400).json({ message: 'Informe ao menos um item.' });

    await connection.beginTransaction();
    transactionStarted = true;
    const total = itens.reduce((sum, item) => sum + Number(item.quantidade || 0) * Number(item.custo_unitario || 0), 0);
    const [purchaseResult] = await connection.query(
      'INSERT INTO compras (fornecedor_id, usuario_id, status, total, observacao) VALUES (?, ?, ?, ?, ?)',
      [req.body.fornecedor_id || null, req.user.id, 'recebida', total, req.body.observacao || null]
    );

    for (const item of itens) {
      const quantity = Number(item.quantidade || 0);
      const cost = Number(item.custo_unitario || 0);
      if (!item.produto_id || !Number.isFinite(quantity) || quantity <= 0) throw new Error('Item de compra inválido.');
      await connection.query(
        'INSERT INTO compra_itens (compra_id, produto_id, quantidade, custo_unitario, lote, validade) VALUES (?, ?, ?, ?, ?, ?)',
        [purchaseResult.insertId, item.produto_id, quantity, cost, item.lote || null, item.validade || null]
      );
      await connection.query('UPDATE produtos SET quantidade = quantidade + ?, custo = ? WHERE id = ?', [quantity, cost, item.produto_id]);
      if (item.lote && item.validade) {
        await connection.query(
          'INSERT INTO lotes_estoque (produto_id, fornecedor_id, lote, validade, quantidade, custo_unitario) VALUES (?, ?, ?, ?, ?, ?)',
          [item.produto_id, req.body.fornecedor_id || null, item.lote, item.validade, quantity, cost]
        );
      }
      await registerStockMovement(connection, {
        produtoId: item.produto_id,
        usuarioId: req.user.id,
        tipo: 'entrada_compra',
        quantidade: quantity,
        motivo: `Compra #${purchaseResult.insertId}`
      });
    }

    await audit(connection, req.user.id, 'compra.recebida', 'compras', purchaseResult.insertId, req.body);
    await connection.commit();
    res.status(201).json({ id: purchaseResult.insertId, total });
  } catch (err) {
    if (transactionStarted) await connection.rollback().catch(() => null);
    res.status(400).json({ message: err.message || 'Erro ao receber compra.' });
  } finally {
    connection.release();
  }
});

app.post('/api/medicamentos/:produtoId/detalhes', authenticateToken, requirePermission('gerenciar_produtos', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query(
      `
        INSERT INTO detalhes_medicamento (
          produto_id, principio_ativo, registro_anvisa, laboratorio, tipo_medicamento, tarja, exige_receita, controlado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          principio_ativo = VALUES(principio_ativo),
          registro_anvisa = VALUES(registro_anvisa),
          laboratorio = VALUES(laboratorio),
          tipo_medicamento = VALUES(tipo_medicamento),
          tarja = VALUES(tarja),
          exige_receita = VALUES(exige_receita),
          controlado = VALUES(controlado)
      `,
      [
        req.params.produtoId,
        req.body.principio_ativo || null,
        req.body.registro_anvisa || null,
        req.body.laboratorio || null,
        req.body.tipo_medicamento || 'comum',
        req.body.tarja || 'sem_tarja',
        Boolean(req.body.exige_receita),
        Boolean(req.body.controlado)
      ]
    );
    await audit(connection, req.user.id, 'medicamento.detalhes_salvos', 'detalhes_medicamento', Number(req.params.produtoId), req.body);
    res.json({ produto_id: Number(req.params.produtoId), ...req.body });
  } finally {
    connection.release();
  }
});

app.get('/api/lotes', authenticateToken, requirePermission('gerenciar_estoque', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT l.*, p.nome AS produto_nome
      FROM lotes_estoque l
      JOIN produtos p ON p.id = l.produto_id
      ORDER BY l.validade ASC
      LIMIT 300
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/validade/alertas', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT l.*, p.nome AS produto_nome,
        CASE
          WHEN l.validade < CURDATE() THEN 'vencido'
          WHEN l.validade <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'vencendo'
          ELSE 'ok'
        END AS status_validade
      FROM lotes_estoque l
      JOIN produtos p ON p.id = l.produto_id
      WHERE l.quantidade > 0 AND l.validade <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      ORDER BY l.validade ASC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/reposicao/sugestoes', authenticateToken, requirePermission('gerenciar_estoque', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT p.id, p.nome, p.quantidade, p.estoque_minimo,
        COALESCE(SUM(iv.quantidade), 0) AS vendas_30_dias,
        GREATEST(p.estoque_minimo * 2 - p.quantidade, 0) AS quantidade_sugerida
      FROM produtos p
      LEFT JOIN itens_venda iv ON iv.produto_id = p.id
      LEFT JOIN vendas v ON v.id = iv.venda_id AND v.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      WHERE p.ativo = TRUE
      GROUP BY p.id
      HAVING p.quantidade <= p.estoque_minimo OR vendas_30_dias > p.quantidade
      ORDER BY quantidade_sugerida DESC, vendas_30_dias DESC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/caixa/:id/relatorio', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const summary = await getCashSummary(connection, req.params.id);
    if (!summary) return res.status(404).json({ message: 'Caixa não encontrado.' });

    const [vendas] = await connection.query(
      `
        SELECT v.id, v.numero_pedido, v.total, v.status, v.created_at, GROUP_CONCAT(p.metodo SEPARATOR ', ') AS formas_pagamento
        FROM vendas v
        LEFT JOIN pagamentos p ON p.venda_id = v.id
        WHERE v.caixa_id = ?
        GROUP BY v.id
        ORDER BY v.created_at ASC
      `,
      [req.params.id]
    );
    const [movimentos] = await connection.query('SELECT * FROM caixa_movimentos WHERE caixa_id = ? ORDER BY created_at ASC', [req.params.id]);
    const ticketMedio = vendas.length ? Number((summary.total_vendido / vendas.length).toFixed(2)) : 0;

    res.json({
      ...summary,
      quantidade_vendas: vendas.filter((sale) => sale.status !== 'cancelada').length,
      ticket_medio: ticketMedio,
      vendas,
      movimentos,
      cancelamentos: vendas.filter((sale) => sale.status === 'cancelada')
    });
  } finally {
    connection.release();
  }
});

app.get('/api/gerencial/resumo', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const cash = await getOpenCash(connection, req.user.id);
    const resumoCaixa = cash ? await getCashSummary(connection, cash.id) : null;
    const [[totaisDia]] = await connection.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN p.metodo IN ('cash','dinheiro') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS cash_total,
          COALESCE(SUM(CASE WHEN p.metodo = 'pix' AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS pix_total,
          COALESCE(SUM(CASE WHEN p.metodo IN ('card_credit','card_debit','cartao','credito','debito') AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS card_total,
          COALESCE(SUM(CASE WHEN p.metodo = 'voucher' AND p.status IN ('approved','aprovado') THEN p.valor ELSE 0 END), 0) AS voucher_total
        FROM pagamentos p
        JOIN vendas v ON v.id = p.venda_id
        WHERE v.status <> 'cancelada'
          AND DATE(v.created_at) = CURDATE()
      `
    );

    const totalSales = Number((
      Number(totaisDia.cash_total) +
      Number(totaisDia.pix_total) +
      Number(totaisDia.card_total) +
      Number(totaisDia.voucher_total)
    ).toFixed(2));

    res.json({
      caixa_aberto: cash,
      resumo_caixa: resumoCaixa,
      dia: {
        cash_total: Number(totaisDia.cash_total),
        pix_total: Number(totaisDia.pix_total),
        card_total: Number(totaisDia.card_total),
        voucher_total: Number(totaisDia.voucher_total),
        total_sales: totalSales
      }
    });
  } finally {
    connection.release();
  }
});

app.post('/api/gerencial/autorizar', authenticateToken, async (req, res) => {
  const login = String(req.body.login || req.body.email || '').trim();
  const password = String(req.body.senha || req.body.password || '');
  const action = String(req.body.acao || req.body.action || 'acao_gerencial').trim();

  if (!login || !password) {
    return res.status(400).json({ message: 'Informe usuário e senha do gerente ou administrador.' });
  }

  const connection = await db.getConnection();
  try {
    const [users] = await connection.query(
      "SELECT id, nome, email, senha, nivel_acesso FROM usuarios WHERE email = ? AND ativo = TRUE LIMIT 1",
      [login]
    );
    const manager = users[0];

    if (!manager || !['admin', 'gerente'].includes(manager.nivel_acesso)) {
      return res.status(403).json({ message: 'Autorização negada. Use um gerente ou administrador ativo.' });
    }

    const passwordMatches = await bcrypt.compare(password, manager.senha);
    if (!passwordMatches) {
      return res.status(403).json({ message: 'Senha gerencial inválida.' });
    }

    await audit(connection, manager.id, `gerencial.autorizacao.${action}`, 'usuarios', req.user.id, {
      solicitante_id: req.user.id,
      autorizador_id: manager.id
    });

    res.json({
      autorizado: true,
      autorizador: {
        id: manager.id,
        nome: manager.nome,
        nivel_acesso: manager.nivel_acesso
      }
    });
  } finally {
    connection.release();
  }
});

app.get('/api/gerencial/vendas', authenticateToken, requirePermission('gerenciar_vendas', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const termo = String(req.query.q || '').trim();
    const params = [];
    const where = ['1=1'];

    if (termo) {
      params.push(`%${termo}%`, termo, `%${termo}%`);
      where.push('(CAST(v.numero_pedido AS CHAR) LIKE ? OR v.id = ? OR u.nome LIKE ?)');
    }

    if (req.query.data) {
      params.push(req.query.data);
      where.push('DATE(v.created_at) = ?');
    }

    const [rows] = await connection.query(
      `
        SELECT
          v.id,
          v.numero_pedido,
          v.total,
          v.status,
          v.forma_pagamento,
          v.created_at,
          u.nome AS operador_nome,
          GROUP_CONCAT(CONCAT(iv.produto_nome, ' x', iv.quantidade) ORDER BY iv.id SEPARATOR ', ') AS itens
        FROM vendas v
        LEFT JOIN usuarios u ON u.id = v.usuario_id
        LEFT JOIN itens_venda iv ON iv.venda_id = v.id
        WHERE ${where.join(' AND ')}
        GROUP BY v.id
        ORDER BY v.created_at DESC
        LIMIT 80
      `,
      params
    );

    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/gerencial/vendas/:id/cupom', authenticateToken, requirePermission('gerenciar_vendas', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [[sale]] = await connection.query(
      `
        SELECT v.*, u.nome AS operador_nome
        FROM vendas v
        LEFT JOIN usuarios u ON u.id = v.usuario_id
        WHERE v.id = ? OR v.numero_pedido = ?
        LIMIT 1
      `,
      [req.params.id, req.params.id]
    );

    if (!sale) {
      return res.status(404).json({ message: 'Venda não encontrada.' });
    }

    const [items] = await connection.query(
      `
        SELECT id, produto_nome, quantidade, preco_unitario, subtotal, observacoes, customization_summary
        FROM itens_venda
        WHERE venda_id = ?
        ORDER BY id ASC
      `,
      [sale.id]
    );
    const [payments] = await connection.query(
      'SELECT metodo, valor, troco, valor_recebido, status, created_at FROM pagamentos WHERE venda_id = ? ORDER BY id ASC',
      [sale.id]
    );

    await audit(connection, req.user.id, 'gerencial.cupom_recuperado', 'vendas', sale.id);

    res.json({ venda: sale, itens: items, pagamentos: payments });
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/operadores/:operadorId', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const operadorId = Number(req.params.operadorId);

  if (!Number.isInteger(operadorId) || operadorId <= 0) {
    return res.status(400).json({ message: 'Operador inválido.' });
  }

  const inicio = req.query.inicio || '1970-01-01';
  const fim = req.query.fim || '2999-12-31';
  const connection = await db.getConnection();

  try {
    const [[operador]] = await connection.query(
      'SELECT id, nome, email, nivel_acesso, ativo FROM usuarios WHERE id = ?',
      [operadorId]
    );

    if (!operador) {
      return res.status(404).json({ message: 'Operador não encontrado.' });
    }

    const [[totais]] = await connection.query(
      `
        SELECT
          COALESCE(SUM(CASE WHEN v.status <> 'cancelada' THEN v.total ELSE 0 END), 0) AS total_vendido,
          COALESCE(COUNT(CASE WHEN v.status <> 'cancelada' THEN 1 END), 0) AS quantidade_pedidos
        FROM vendas v
        WHERE v.usuario_id = ?
          AND DATE(v.created_at) BETWEEN ? AND ?
      `,
      [operadorId, inicio, fim]
    );

    const [pagamentosPorForma] = await connection.query(
      `
        SELECT
          p.metodo,
          COALESCE(SUM(p.valor), 0) AS valor,
          COUNT(*) AS quantidade
        FROM pagamentos p
        JOIN vendas v ON v.id = p.venda_id
        WHERE v.usuario_id = ?
          AND v.status <> 'cancelada'
          AND p.status IN ('approved','aprovado')
          AND DATE(v.created_at) BETWEEN ? AND ?
        GROUP BY p.metodo
        ORDER BY valor DESC
      `,
      [operadorId, inicio, fim]
    );

    const [pedidos] = await connection.query(
      `
        SELECT
          v.id,
          v.numero_pedido,
          v.canal,
          v.status,
          v.total,
          v.created_at,
          GROUP_CONCAT(CONCAT(iv.produto_nome, ' x', iv.quantidade) ORDER BY iv.id SEPARATOR ', ') AS itens
        FROM vendas v
        LEFT JOIN itens_venda iv ON iv.venda_id = v.id
        WHERE v.usuario_id = ?
          AND DATE(v.created_at) BETWEEN ? AND ?
        GROUP BY v.id
        ORDER BY v.created_at DESC
      `,
      [operadorId, inicio, fim]
    );

    const [cancelamentos] = await connection.query(
      `
        SELECT oc.*, v.numero_pedido, v.total
        FROM order_cancellations oc
        JOIN vendas v ON v.id = oc.order_id
        WHERE oc.operador_id = ?
          AND DATE(oc.criado_em) BETWEEN ? AND ?
        ORDER BY oc.criado_em DESC
      `,
      [operadorId, inicio, fim]
    );

    const [movimentosCaixa] = await connection.query(
      `
        SELECT cm.*
        FROM caixa_movimentos cm
        WHERE cm.usuario_id = ?
          AND cm.tipo IN ('sangria','suprimento')
          AND DATE(cm.created_at) BETWEEN ? AND ?
        ORDER BY cm.created_at DESC
      `,
      [operadorId, inicio, fim]
    );

    const [historicoTurno] = await connection.query(
      `
        SELECT id, acao, referencia_id, descricao, criado_em
        FROM operator_logs
        WHERE operador_id = ?
          AND DATE(criado_em) BETWEEN ? AND ?
        ORDER BY criado_em DESC
        LIMIT 300
      `,
      [operadorId, inicio, fim]
    );

    res.json({
      operador,
      periodo: { inicio, fim },
      total_vendido: Number(totais.total_vendido),
      quantidade_pedidos: Number(totais.quantidade_pedidos),
      pagamentos: {
        dinheiro: Number(pagamentosPorForma.find((item) => ['cash', 'dinheiro'].includes(item.metodo))?.valor || 0),
        pix: Number(pagamentosPorForma.find((item) => item.metodo === 'pix')?.valor || 0),
        cartao: Number(pagamentosPorForma
          .filter((item) => ['card_credit', 'card_debit', 'cartao', 'credito', 'debito', 'voucher'].includes(item.metodo))
          .reduce((sum, item) => sum + Number(item.valor), 0)
          .toFixed(2)),
        detalhe: pagamentosPorForma
      },
      pedidos,
      cancelamentos,
      sangrias: movimentosCaixa.filter((item) => item.tipo === 'sangria'),
      suprimentos: movimentosCaixa.filter((item) => item.tipo === 'suprimento'),
      historico_turno: historicoTurno
    });
  } finally {
    connection.release();
  }
});

app.get('/api/receitas/:produtoId', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(
      `
        SELECT r.*, p.nome AS ingrediente_nome, p.unidade AS ingrediente_unidade
        FROM receitas r
        JOIN produtos p ON p.id = r.ingrediente_id
        WHERE r.produto_id = ?
      `,
      [req.params.produtoId]
    );
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.post('/api/receitas/:produtoId/itens', authenticateToken, requirePermission('gerenciar_produtos', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const quantidade = Number(req.body.quantidade || 0);
    const extraPrice = Number(req.body.extra_price || 0);
    if (!Number.isFinite(quantidade) || quantidade <= 0) return res.status(400).json({ message: 'Quantidade inválida.' });
    if (!Number.isFinite(extraPrice) || extraPrice < 0) return res.status(400).json({ message: 'Preço adicional inválido.' });
    const [result] = await connection.query(
      `
        INSERT INTO receitas (
          produto_id,
          ingrediente_id,
          quantidade,
          unidade,
          required,
          removable,
          allow_extra,
          extra_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.params.produtoId,
        req.body.ingrediente_id,
        quantidade,
        req.body.unidade || 'un',
        req.body.required !== false,
        req.body.removable !== false,
        req.body.allow_extra !== false,
        extraPrice
      ]
    );
    await audit(connection, req.user.id, 'receita.item_criado', 'receitas', result.insertId, req.body);
    res.status(201).json({ id: result.insertId });
  } finally {
    connection.release();
  }
});

app.delete('/api/receitas/itens/:id', authenticateToken, requirePermission('gerenciar_produtos', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query('DELETE FROM receitas WHERE id = ?', [req.params.id]);
    await audit(connection, req.user.id, 'receita.item_removido', 'receitas', Number(req.params.id));
    res.json({ message: 'Item removido.' });
  } finally {
    connection.release();
  }
});

app.get('/api/combos/:comboId', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(
      `
        SELECT ci.*, p.nome AS produto_nome
        FROM combo_itens ci
        JOIN produtos p ON p.id = ci.produto_id
        WHERE ci.combo_id = ?
      `,
      [req.params.comboId]
    );
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.post('/api/combos/:comboId/itens', authenticateToken, requirePermission('gerenciar_produtos', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const comboId = Number(req.params.comboId);
    const produtoId = Number(req.body.produto_id);
    const grupo = req.body.grupo || null;

    if (!Number.isInteger(comboId) || comboId <= 0 || !Number.isInteger(produtoId) || produtoId <= 0) {
      return res.status(400).json({ message: 'Item de combo inválido.' });
    }

    const [existingItems] = await connection.query(
      `
        SELECT id
        FROM combo_itens
        WHERE combo_id = ?
          AND produto_id = ?
          AND COALESCE(grupo, '') = COALESCE(?, '')
        LIMIT 1
      `,
      [comboId, produtoId, grupo]
    );

    if (existingItems.length > 0) {
      return res.status(409).json({ message: 'Este produto já está no combo.' });
    }

    const [result] = await connection.query(
      'INSERT INTO combo_itens (combo_id, produto_id, quantidade, obrigatorio, grupo, adicional_preco) VALUES (?, ?, ?, ?, ?, ?)',
      [comboId, produtoId, Number(req.body.quantidade || 1), req.body.obrigatorio !== false, grupo, Number(req.body.adicional_preco || 0)]
    );
    await audit(connection, req.user.id, 'combo.item_criado', 'combo_itens', result.insertId, req.body);
    res.status(201).json({ id: result.insertId });
  } finally {
    connection.release();
  }
});

app.delete('/api/combos/itens/:id', authenticateToken, requirePermission('gerenciar_produtos', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query('DELETE FROM combo_itens WHERE id = ?', [req.params.id]);
    await audit(connection, req.user.id, 'combo.item_removido', 'combo_itens', Number(req.params.id));
    res.json({ message: 'Item removido.' });
  } finally {
    connection.release();
  }
});

app.get('/api/estoque/movimentacoes', authenticateToken, requirePermission('gerenciar_estoque', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT m.*, p.nome AS produto_nome
      FROM movimentacoes_estoque m
      JOIN produtos p ON p.id = m.produto_id
      ORDER BY m.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.post('/api/estoque/movimentacoes', authenticateToken, requirePermission('gerenciar_estoque', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const produtoId = Number(req.body.produto_id);
    const quantidade = Number(req.body.quantidade || 0);
    const tipo = String(req.body.tipo || 'ajuste');
    if (!produtoId || !Number.isFinite(quantidade) || quantidade === 0) return res.status(400).json({ message: 'Movimentação inválida.' });
    await connection.query('UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?', [quantidade, produtoId]);
    await registerStockMovement(connection, { produtoId, usuarioId: req.user.id, tipo, quantidade, motivo: req.body.motivo || null });
    await audit(connection, req.user.id, 'estoque.movimentado', 'produtos', produtoId, req.body);
    res.status(201).json({ produto_id: produtoId, tipo, quantidade });
  } finally {
    connection.release();
  }
});

app.use('/api/cozinha', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), kitchenRoutes);
app.use('/api/recuperador-pedidos', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), recoverOrderRoutes);

app.get('/api/cozinha/pedidos', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT pc.*, v.numero_pedido, v.created_at AS venda_criada_em,
        EXISTS (
          SELECT 1
          FROM order_status_history osh
          WHERE osh.order_id = v.id
            AND osh.new_status IN ('em_preparo','preparing','retornado_para_preparo','returned_to_preparation')
            AND osh.old_status IN ('pronto','ready','entregue','delivered')
        ) AS recuperado
      FROM pedidos_cozinha pc
      JOIN vendas v ON v.id = pc.venda_id
      WHERE pc.status NOT IN ('entregue', 'cancelado', 'movido_expedicao')
      ORDER BY pc.created_at ASC
    `);

    if (rows.length === 0) {
      return res.json([]);
    }

    const saleIds = [...new Set(rows.map((row) => Number(row.venda_id)))];
    const placeholders = saleIds.map(() => '?').join(', ');
    const [items] = await connection.query(
      `
        SELECT
          iv.venda_id,
          iv.id,
          iv.produto_id,
          iv.produto_nome,
          iv.categoria,
          iv.quantidade,
          iv.observacoes,
          iv.customization_summary,
          koi.station AS routed_station,
          p.nome,
          p.tipo,
          p.preparation_station,
          p.estacao_cozinha
        FROM itens_venda iv
        LEFT JOIN kitchen_order_items koi ON koi.order_id = iv.venda_id AND koi.order_item_id = iv.id
        LEFT JOIN produtos p ON p.id = iv.produto_id
        WHERE iv.venda_id IN (${placeholders})
        ORDER BY iv.id ASC
      `,
      saleIds
    );

    const itemsBySaleAndStation = new Map();
    for (const item of items) {
      const estacaoOriginal = resolveKitchenStation(item);
      const estacao = normalizeKitchenStation(item.routed_station) || estacaoOriginal;
      const key = `${Number(item.venda_id)}:${estacao}`;
      const current = itemsBySaleAndStation.get(key) || [];
      current.push({
        id: Number(item.id),
        produto_id: item.produto_id === null ? null : Number(item.produto_id),
        nome: item.produto_nome || `Produto #${item.produto_id}`,
        quantidade: Number(item.quantidade),
        observacoes: item.observacoes || null,
        customization_summary: item.customization_summary || null,
        estacao,
        estacao_original: estacaoOriginal
      });
      itemsBySaleAndStation.set(key, current);
    }

    res.json(rows.map((row) => ({
      ...row,
      itens: itemsBySaleAndStation.get(`${Number(row.venda_id)}:${row.estacao || 'expedicao'}`) || []
    })));
  } finally {
    connection.release();
  }
});

app.patch('/api/cozinha/pedidos/:id/status', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const status = String(req.body.status || 'recebido');
    const reason = String(req.body.motivo || req.body.reason || '').trim();
    const [[pedido]] = await connection.query(
      'SELECT id, venda_id, estacao, status FROM pedidos_cozinha WHERE id = ?',
      [req.params.id]
    );

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido de cozinha não encontrado.' });
    }

    if (status === 'retornar_preparo') {
      const targetStations = resolveReturnStations(req.body.estacao || req.body.estacao_alvo || req.body.section || req.body.secao);

      if (!reason) {
        return res.status(400).json({ message: 'Informe o motivo da devolução.' });
      }

      if (targetStations.length === 0) {
        return res.status(400).json({ message: 'Informe uma seção de preparo válida para voltar o pedido.' });
      }

      if (pedido.estacao !== 'expedicao') {
        return res.status(400).json({ message: 'Só é possível voltar pedidos que já estão na expedição.' });
      }

      const [items] = await connection.query(
        `
          SELECT
            koi.id,
            koi.order_id,
            koi.order_item_id,
            koi.station,
            iv.produto_id,
            iv.produto_nome,
            iv.categoria,
            p.nome,
            p.tipo,
            p.preparation_station,
            p.estacao_cozinha
          FROM kitchen_order_items koi
          LEFT JOIN itens_venda iv ON iv.id = koi.order_item_id
          LEFT JOIN produtos p ON p.id = iv.produto_id
          WHERE koi.order_id = ? AND koi.station = 'expedicao'
        `,
        [pedido.venda_id]
      );

      const targetStationSet = new Set(targetStations);
      const itemsToReturn = items
        .map((item) => ({ ...item, estacao_original: resolveKitchenStation(item) }))
        .filter((item) => targetStationSet.has(item.estacao_original));

      if (itemsToReturn.length === 0) {
        return res.status(400).json({ message: 'Não há itens desta seção na expedição para voltar.' });
      }

      await connection.beginTransaction();
      try {
        const itemsByStation = new Map();
        for (const item of itemsToReturn) {
          const current = itemsByStation.get(item.estacao_original) || [];
          current.push(Number(item.id));
          itemsByStation.set(item.estacao_original, current);
        }

        for (const [station, itemIds] of itemsByStation.entries()) {
          await connection.query(
            `
              UPDATE kitchen_order_items
              SET station = ?, status = 'received', finished_at = NULL
              WHERE id IN (${itemIds.map(() => '?').join(', ')})
            `,
            [station, ...itemIds]
          );

          const [[existingStationOrder]] = await connection.query(
            `
              SELECT id
              FROM pedidos_cozinha
              WHERE venda_id = ? AND estacao = ? AND id <> ?
              ORDER BY created_at ASC
              LIMIT 1
            `,
            [pedido.venda_id, station, req.params.id]
          );

          if (existingStationOrder) {
            await connection.query(
              `
                UPDATE pedidos_cozinha
                SET status = 'recebido',
                    iniciado_em = NULL,
                    pronto_em = NULL,
                    saiu_para_entrega_em = NULL,
                    entregue_em = NULL
                WHERE id = ?
              `,
              [existingStationOrder.id]
            );
          } else {
            await connection.query(
              'INSERT INTO pedidos_cozinha (venda_id, estacao, status) VALUES (?, ?, ?)',
              [pedido.venda_id, station, 'recebido']
            );
          }
        }

        const [[remainingExpeditionItems]] = await connection.query(
          "SELECT COUNT(*) AS total FROM kitchen_order_items WHERE order_id = ? AND station = 'expedicao'",
          [pedido.venda_id]
        );

        if (Number(remainingExpeditionItems.total) === 0) {
          await connection.query(
            `
              UPDATE pedidos_cozinha
              SET status = 'movido_expedicao',
                  saiu_para_entrega_em = NULL,
                  entregue_em = NULL
              WHERE id = ?
            `,
            [req.params.id]
          );
        } else {
          await connection.query(
            `
              UPDATE pedidos_cozinha
              SET status = 'recebido',
                  saiu_para_entrega_em = NULL,
                  entregue_em = NULL
              WHERE id = ?
            `,
            [req.params.id]
          );
        }

        await connection.query("UPDATE vendas SET status = 'preparing' WHERE id = ? AND status <> 'cancelada'", [pedido.venda_id]);
        await registerOrderStatusHistory(connection, {
          orderId: pedido.venda_id,
          fromStatus: 'expedicao',
          toStatus: 'em_preparo',
          userId: req.user.id,
          reason
        });
        await audit(connection, req.user.id, 'cozinha.pedido_retornado_preparo', 'pedidos_cozinha', Number(req.params.id), {
          secoes: targetStations,
          itens: itemsToReturn.map((item) => Number(item.id)),
          motivo: reason
        });
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }

      broadcastKitchenEvent('kitchen_order_returned', {
        id: Number(req.params.id),
        venda_id: Number(pedido.venda_id),
        secoes: targetStations
      });
      return res.json({ id: Number(req.params.id), status: 'recebido', secoes: targetStations });
    }

    if (status === 'voltar_etapa') {
      if (!reason) {
        return res.status(400).json({ message: 'Informe o motivo da devolução.' });
      }

      const previousStatus = {
        pronto: 'em_preparo',
        em_preparo: 'recebido'
      }[pedido.status];

      if (!previousStatus) {
        return res.status(400).json({ message: 'Este pedido não possui etapa anterior disponível para voltar.' });
      }

      const data = {
        recebido: ', iniciado_em = NULL, pronto_em = NULL, saiu_para_entrega_em = NULL, entregue_em = NULL',
        'em_preparo': ', pronto_em = NULL, saiu_para_entrega_em = NULL, entregue_em = NULL'
      }[previousStatus] || '';

      await connection.query(`UPDATE pedidos_cozinha SET status = ? ${data} WHERE id = ?`, [previousStatus, req.params.id]);
      await registerOrderStatusHistory(connection, {
        orderId: pedido.venda_id,
        fromStatus: pedido.status,
        toStatus: previousStatus,
        userId: req.user.id,
        reason
      });
      await audit(connection, req.user.id, 'cozinha.pedido_voltou_etapa', 'pedidos_cozinha', Number(req.params.id), {
        status_anterior: pedido.status,
        status_novo: previousStatus,
        motivo: reason
      });
      broadcastKitchenEvent('kitchen_order_updated', { id: Number(req.params.id), status: previousStatus });
      return res.json({ id: Number(req.params.id), status: previousStatus });
    }

    if ((status === 'pronto' || status === 'expedicao') && pedido.estacao !== 'expedicao') {
      const [[existingExpeditionOrder]] = await connection.query(
        `
          SELECT id
          FROM pedidos_cozinha
          WHERE venda_id = ?
            AND estacao = 'expedicao'
            AND status NOT IN ('entregue', 'cancelado', 'movido_expedicao')
            AND id <> ?
          ORDER BY created_at ASC
          LIMIT 1
        `,
        [pedido.venda_id, req.params.id]
      );

      if (existingExpeditionOrder) {
        await connection.query(
          `
            UPDATE pedidos_cozinha
            SET status = 'movido_expedicao',
                pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP),
                saiu_para_entrega_em = NULL,
                entregue_em = NULL
            WHERE id = ?
          `,
          [req.params.id]
        );
        await connection.query(
          `
            UPDATE pedidos_cozinha
            SET status = 'pronto',
                pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP),
                saiu_para_entrega_em = NULL,
                entregue_em = NULL
            WHERE id = ?
          `,
          [existingExpeditionOrder.id]
        );
      } else {
        await connection.query(
          `
            UPDATE pedidos_cozinha
            SET estacao = 'expedicao',
                status = 'pronto',
                pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP),
                saiu_para_entrega_em = NULL,
                entregue_em = NULL
            WHERE id = ?
          `,
          [req.params.id]
        );
      }

      await connection.query(
        `
          UPDATE kitchen_order_items
          SET station = 'expedicao', status = 'received', finished_at = COALESCE(finished_at, CURRENT_TIMESTAMP)
          WHERE order_id = ? AND station = ?
        `,
        [pedido.venda_id, pedido.estacao]
      );
      await audit(connection, req.user.id, 'cozinha.enviado_expedicao', 'pedidos_cozinha', Number(req.params.id), {
        estacao_anterior: pedido.estacao,
        pedido_expedicao_id: existingExpeditionOrder?.id || Number(req.params.id)
      });
      await registerOrderStatusHistory(connection, {
        orderId: pedido.venda_id,
        fromStatus: pedido.status,
        toStatus: 'pronto',
        userId: req.user.id,
        reason: null
      });
      await connection.query("UPDATE vendas SET status = 'ready', ready_at = COALESCE(ready_at, CURRENT_TIMESTAMP) WHERE id = ?", [pedido.venda_id]);
      broadcastKitchenEvent('kitchen_order_updated', {
        id: existingExpeditionOrder?.id || Number(req.params.id),
        status: 'pronto',
        estacao: 'expedicao'
      });
      return res.json({
        id: existingExpeditionOrder?.id || Number(req.params.id),
        status: 'pronto',
        estacao: 'expedicao'
      });
    }

    if (status === 'entregue' && pedido.estacao === 'expedicao' && pedido.status !== 'pronto') {
      return res.status(400).json({
        message: 'Pedido ainda não está pronto. A cozinha precisa marcar o pedido como pronto antes da entrega.'
      });
    }

    const data = {
      recebido: ', iniciado_em = NULL, pronto_em = NULL, saiu_para_entrega_em = NULL, entregue_em = NULL',
      'em_preparo': ', iniciado_em = COALESCE(iniciado_em, CURRENT_TIMESTAMP)',
      pronto: ', pronto_em = COALESCE(pronto_em, CURRENT_TIMESTAMP)',
      saiu_para_entrega: ', saiu_para_entrega_em = COALESCE(saiu_para_entrega_em, CURRENT_TIMESTAMP)',
      entregue: ', entregue_em = COALESCE(entregue_em, CURRENT_TIMESTAMP)'
    }[status] || '';
    await connection.query(`UPDATE pedidos_cozinha SET status = ? ${data} WHERE id = ?`, [status, req.params.id]);
    if (status === 'entregue') {
      await connection.query("UPDATE vendas SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id = ?", [pedido.venda_id]);
    }
    await registerOrderStatusHistory(connection, {
      orderId: pedido.venda_id,
      fromStatus: pedido.status,
      toStatus: status,
      userId: req.user.id,
      reason: reason || null
    });
    await audit(connection, req.user.id, 'cozinha.status_alterado', 'pedidos_cozinha', Number(req.params.id), { status });
    broadcastKitchenEvent('kitchen_order_updated', { id: Number(req.params.id), status });
    res.json({ id: Number(req.params.id), status });
  } finally {
    connection.release();
  }
});

app.get('/api/recuperador-pedidos/:numero', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const numero = String(req.params.numero || '').trim();
    const [rows] = await connection.query(
      `
        SELECT
          v.id,
          v.numero_pedido,
          v.canal,
          v.status AS venda_status,
          v.total,
          v.created_at,
          MAX(pc.status) AS cozinha_status,
          EXISTS (
            SELECT 1
            FROM order_status_history osh
            WHERE osh.order_id = v.id
              AND osh.new_status IN ('em_preparo','preparing','retornado_para_preparo','returned_to_preparation')
              AND osh.old_status IN ('pronto','ready','entregue','delivered')
          ) AS recuperado
        FROM vendas v
        LEFT JOIN pedidos_cozinha pc ON pc.venda_id = v.id
        WHERE v.id = ? OR v.numero_pedido = ?
        GROUP BY v.id
        LIMIT 1
      `,
      [numero, numero]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const order = rows[0];
    const recoverableStatuses = new Set(['ready', 'delivered', 'pronto', 'entregue']);
    if (!recoverableStatuses.has(String(order.venda_status)) && !recoverableStatuses.has(String(order.cozinha_status))) {
      return res.status(400).json({ message: 'Somente pedidos prontos ou entregues podem ser recuperados.' });
    }

    const [items] = await connection.query(
      `
        SELECT
          id,
          produto_id,
          produto_nome AS nome,
          categoria,
          quantidade,
          preco_unitario,
          subtotal,
          observacoes,
          customization_summary
        FROM itens_venda
        WHERE venda_id = ?
        ORDER BY id ASC
      `,
      [order.id]
    );

    res.json({ ...order, itens: items });
  } finally {
    connection.release();
  }
});

app.patch('/api/recuperador-pedidos/:id/recuperar', authenticateToken, requirePermission('gerenciar_cozinha', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  const reason = String(req.body.motivo || req.body.reason || '').trim();

  if (!reason) {
    connection.release();
    return res.status(400).json({ message: 'Informe o motivo da recuperação.' });
  }

  try {
    const [[order]] = await connection.query(
      `
        SELECT
          v.id,
          v.status AS venda_status,
          MAX(pc.status) AS cozinha_status
        FROM vendas v
        LEFT JOIN pedidos_cozinha pc ON pc.venda_id = v.id
        WHERE v.id = ?
        GROUP BY v.id
      `,
      [req.params.id]
    );

    if (!order) {
      return res.status(404).json({ message: 'Pedido não encontrado.' });
    }

    const recoverableStatuses = new Set(['ready', 'delivered', 'pronto', 'entregue']);
    if (!recoverableStatuses.has(String(order.venda_status)) && !recoverableStatuses.has(String(order.cozinha_status))) {
      return res.status(400).json({ message: 'Somente pedidos prontos ou entregues podem ser recuperados.' });
    }

    const [items] = await connection.query(
      `
        SELECT
          iv.id,
          iv.venda_id,
          iv.produto_id,
          iv.produto_nome,
          iv.categoria,
          iv.observacoes,
          iv.customization_summary,
          p.nome,
          p.tipo,
          p.preparation_station,
          p.estacao_cozinha
        FROM itens_venda iv
        LEFT JOIN produtos p ON p.id = iv.produto_id
        WHERE iv.venda_id = ?
      `,
      [order.id]
    );

    await connection.beginTransaction();
    try {
      await connection.query(
        `
          UPDATE vendas
          SET status = 'preparing',
              delivered_at = NULL,
              is_recovered = TRUE,
              retry_count = retry_count + 1,
              recovered_from_order_id = COALESCE(recovered_from_order_id, id)
          WHERE id = ?
        `,
        [order.id]
      );

      await connection.query(
        `
          UPDATE pedidos_cozinha
          SET status = 'movido_expedicao',
              saiu_para_entrega_em = NULL,
              entregue_em = NULL
          WHERE venda_id = ?
        `,
        [order.id]
      );

      const stations = [...new Set(items.map((item) => resolveKitchenStation(item)))];
      for (const station of stations) {
        await connection.query(
          `
            UPDATE kitchen_order_items
            SET station = ?, status = 'received', started_at = NULL, finished_at = NULL
            WHERE order_id = ?
              AND order_item_id IN (${items.filter((item) => resolveKitchenStation(item) === station).map(() => '?').join(', ')})
          `,
          [station, order.id, ...items.filter((item) => resolveKitchenStation(item) === station).map((item) => item.id)]
        );

        await connection.query(
          'INSERT INTO pedidos_cozinha (venda_id, estacao, status) VALUES (?, ?, ?)',
          [order.id, station, 'em_preparo']
        );
      }

      await registerOrderStatusHistory(connection, {
        orderId: order.id,
        fromStatus: order.venda_status || order.cozinha_status,
        toStatus: 'em_preparo',
        userId: req.user.id,
        reason
      });
      await audit(connection, req.user.id, 'cozinha.pedido_recuperado', 'vendas', Number(order.id), { motivo: reason });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    broadcastKitchenEvent('kitchen_order_recovered', { order_id: Number(order.id), status: 'em_preparo' });
    res.json({ id: Number(order.id), status: 'em_preparo', message: 'Pedido recuperado e enviado novamente para a cozinha.' });
  } finally {
    connection.release();
  }
});

app.get('/api/clientes', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM clientes ORDER BY nome ASC');
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.post('/api/clientes', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [result] = await connection.query(
      'INSERT INTO clientes (nome, telefone, email, documento, endereco) VALUES (?, ?, ?, ?, ?)',
      [req.body.nome, req.body.telefone || null, req.body.email || null, req.body.documento || null, req.body.endereco || null]
    );
    await audit(connection, req.user.id, 'cliente.criado', 'clientes', result.insertId, req.body);
    res.status(201).json({ id: result.insertId });
  } finally {
    connection.release();
  }
});

app.get('/api/configuracoes', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT chave, valor FROM configuracoes ORDER BY chave ASC');
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.put('/api/configuracoes/:chave', authenticateToken, requirePermission('gerenciar_caixa', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.query(
      'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [req.params.chave, String(req.body.valor ?? '')]
    );
    await audit(connection, req.user.id, 'configuracao.alterada', 'configuracoes', null, { chave: req.params.chave, valor: req.body.valor });
    res.json({ chave: req.params.chave, valor: req.body.valor });
  } finally {
    connection.release();
  }
});

app.get('/api/auditoria', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT a.*, u.nome AS usuario_nome
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

// Relatórios
app.get('/api/relatorios/vendas-por-periodo', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const { inicio, fim } = req.query;
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT DATE(created_at) as data, COUNT(*) as vendas, SUM(total) as total
      FROM vendas
      WHERE status = 'finalizada' AND created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY data
    `, [inicio, fim]);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/produtos-mais-vendidos', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT p.nome, SUM(iv.quantidade) as quantidade_vendida, SUM(iv.subtotal) as receita
      FROM itens_venda iv
      JOIN vendas v ON v.id = iv.venda_id
      JOIN produtos p ON p.id = iv.produto_id
      WHERE v.status = 'finalizada'
      GROUP BY p.id, p.nome
      ORDER BY quantidade_vendida DESC
      LIMIT 10
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/vendas-por-canal', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT COALESCE(order_channel, canal) AS canal, COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS total
      FROM vendas
      WHERE status <> 'cancelada'
      GROUP BY COALESCE(order_channel, canal)
      ORDER BY total DESC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/meios-pagamento', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT metodo, status, COUNT(*) AS quantidade, COALESCE(SUM(valor), 0) AS total
      FROM pagamentos
      GROUP BY metodo, status
      ORDER BY total DESC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/margem-produtos', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT id, nome, preco, custo,
        (preco - custo) AS lucro,
        CASE WHEN preco > 0 THEN ROUND(((preco - custo) / preco) * 100, 2) ELSE 0 END AS margem_percentual,
        CASE WHEN preco < custo THEN 'prejuizo' WHEN ((preco - custo) / NULLIF(preco, 0)) * 100 < 20 THEN 'margem_baixa' ELSE 'ok' END AS alerta
      FROM produtos
      WHERE ativo = TRUE
      ORDER BY margem_percentual ASC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/cozinha-performance', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT station AS estacao, COUNT(*) AS itens,
        AVG(TIMESTAMPDIFF(SECOND, started_at, finished_at)) AS tempo_medio_segundos
      FROM kitchen_order_items
      WHERE finished_at IS NOT NULL
      GROUP BY station
      ORDER BY tempo_medio_segundos DESC
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/relatorios/heatmap-vendas', authenticateToken, requirePermission('ver_relatorios', 'Acesso negado.'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT DAYOFWEEK(created_at) AS dia_semana, HOUR(created_at) AS hora, COUNT(*) AS vendas, COALESCE(SUM(total), 0) AS total
      FROM vendas
      WHERE status <> 'cancelada'
      GROUP BY DAYOFWEEK(created_at), HOUR(created_at)
      ORDER BY dia_semana, hora
    `);
    res.json(rows);
  } finally {
    connection.release();
  }
});

app.get('/api/simulacoes/fluxos', authenticateToken, async (req, res) => {
  res.json({
    fast_food: ['pedido balcão', 'pagamento Pix/cartão/dinheiro', 'cozinha/KDS', 'expedição', 'painel', 'retirada'],
    delivery: ['webhook iFood mock', 'aceitar', 'cozinha', 'expedição', 'entregar'],
    drive_thru: ['carro chegou', 'pedido', 'pagamento', 'preparo', 'entrega'],
    kiosk: ['montar pedido', 'pagar', 'cozinha', 'painel'],
    caixa: ['abrir', 'vender', 'alertar valor alto', 'sangria', 'fechar', 'relatório']
  });
});

export default app;
