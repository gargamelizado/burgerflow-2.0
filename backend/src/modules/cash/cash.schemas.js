const { z } = require('zod');

const optionalNumber = z.coerce.number().finite();
const emptyObject = z.object({});
const cashIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const openingBody = z.object({
  numero: optionalNumber.int().positive().optional(),
  operador_id: optionalNumber.int().positive().optional(),
  valor_inicial: optionalNumber.nonnegative().optional(),
  observacao: z.string().max(255).optional(),
  gerencial_token: z.string().optional(),
  token_gerencial: z.string().optional(),
  motivo_autorizacao: z.string().max(255).optional(),
  motivo: z.string().max(255).optional(),
});

const closingBody = z.object({
  valor_final: optionalNumber.nonnegative(),
  observacao: z.string().max(255).optional(),
  gerencial_token: z.string().optional(),
  token_gerencial: z.string().optional(),
  motivo_autorizacao: z.string().max(255).optional(),
  motivo: z.string().max(255).optional(),
});

const schemas = {
  empty: z.object({ body: emptyObject, query: emptyObject, params: emptyObject }),
  open: z.object({ body: openingBody, query: emptyObject, params: emptyObject }),
  close: z.object({ body: closingBody, query: emptyObject, params: emptyObject }),
  closeById: z.object({
    body: closingBody,
    query: emptyObject,
    params: cashIdParams,
  }),
  movement: z.object({
    body: z.object({
      caixa_id: optionalNumber.int().positive(),
      tipo: z.enum(['suprimento', 'sangria']),
      valor: optionalNumber.positive(),
      motivo: z.string().trim().min(1).max(255),
      gerencial_token: z.string().optional(),
      token_gerencial: z.string().optional(),
      motivo_autorizacao: z.string().max(255).optional(),
    }),
    query: emptyObject,
    params: emptyObject,
  }),
  listMovements: z.object({
    body: emptyObject,
    query: z.object({ caixa_id: optionalNumber.int().positive().optional() }),
    params: emptyObject,
  }),
  getById: z.object({
    body: emptyObject,
    query: emptyObject,
    params: cashIdParams,
  }),
  testOpen: z.object({
    body: z.object({ quantidade: optionalNumber.int().positive() }),
    query: emptyObject,
    params: emptyObject,
  }),
  testSell: z.object({
    body: z.object({
      vendas: z.array(
        z.object({
          caixa_id: optionalNumber.int().positive(),
          item_id: optionalNumber.int().positive().optional(),
          produto_id: optionalNumber.int().positive().optional(),
          quantidade: optionalNumber.positive().optional(),
          cliente_nome: z.string().max(100).optional(),
          forma_pagamento: z.string().max(40).optional(),
          observacao: z.string().max(255).optional(),
        }).refine((venda) => venda.item_id || venda.produto_id, {
          message: 'Informe item_id ou produto_id.',
        })
      ).min(1),
    }),
    query: emptyObject,
    params: emptyObject,
  }),
};

module.exports = schemas;
