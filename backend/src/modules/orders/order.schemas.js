const { z } = require('zod');

const optionalPositiveInteger = z.coerce.number().int().positive().optional();
const emptyObject = z.object({});
const orderIdParams = z.object({
  id: z.coerce.number().int().positive(),
});

const statusBody = z.object({
  status: z.enum(['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado']),
});

const schemas = {
  list: z.object({
    body: emptyObject,
    query: emptyObject,
    params: emptyObject,
  }),
  create: z.object({
    body: z.object({
      caixa_id: z.coerce.number().int().positive(),
      itens: z.array(z.object({
        item_id: optionalPositiveInteger,
        produto_id: optionalPositiveInteger,
        id: optionalPositiveInteger,
        quantidade: z.coerce.number().finite().positive(),
      }).refine((item) => item.item_id || item.produto_id || item.id, {
        message: 'Informe item_id, produto_id ou id.',
      })).min(1),
      cliente_nome: z.string().max(100).optional(),
      tipo: z.enum(['balcao', 'mesa', 'delivery']).optional(),
      forma_pagamento: z.string().max(40).optional(),
      status_pagamento: z.string().max(40).optional(),
      observacao: z.string().max(255).optional(),
      gerencial_token: z.string().optional(),
    }),
    query: emptyObject,
    params: emptyObject,
  }),
  status: z.object({
    body: statusBody,
    query: emptyObject,
    params: orderIdParams,
  }),
};

module.exports = schemas;
