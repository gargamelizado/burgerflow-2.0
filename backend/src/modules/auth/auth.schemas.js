const { z } = require('zod');

const emptyObject = z.object({});

const schemas = {
  login: z.object({
    body: z.object({
      email: z.string().trim().email(),
      senha: z.string().min(1).optional(),
      password: z.string().min(1).optional(),
    }).refine((body) => Boolean(body.senha || body.password), {
      message: 'Senha é obrigatória.',
      path: ['senha'],
    }),
    query: emptyObject,
    params: emptyObject,
  }),
  changePassword: z.object({
    body: z.object({
      senha_atual: z.string().min(1),
      nova_senha: z.string().min(6),
    }),
    query: emptyObject,
    params: emptyObject,
  }),
};

module.exports = schemas;
