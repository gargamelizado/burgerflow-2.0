const { z } = require('zod');
const { gerencialActions } = require('../../config/businessRules');

const emptyObject = z.object({});
const optionalPositiveId = z.coerce.number().int().positive().nullable().optional();

const authorizeBody = z.object({
  identificador: z.string().trim().min(1).optional(),
  email_ou_usuario: z.string().trim().min(1).optional(),
  senha: z.string().min(1),
  acao: z.enum(gerencialActions),
  motivo: z.string().trim().max(255).optional(),
  entidade: z.string().trim().max(100).optional(),
  registro_id: optionalPositiveId,
  valor: z.coerce.number().nonnegative().nullable().optional(),
}).refine(
  (body) => Boolean(body.identificador || body.email_ou_usuario),
  {
    message: 'Informe o usuário ou email do gerente.',
    path: ['identificador'],
  }
);

module.exports = {
  authorize: z.object({
    body: authorizeBody,
    query: emptyObject,
    params: emptyObject,
  }),
};
