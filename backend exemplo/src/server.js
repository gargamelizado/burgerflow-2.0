/**
 * @file server.js
 * @description Ponto de entrada do backend. Inicializa schema, servidor HTTP e WebSocket da cozinha.
 * @author BurgerFlow
 */

// Importa a aplicacao Express configurada com rotas e middlewares.
import app from './app.js';
// Importa HTTP nativo para anexar Express e WebSocket ao mesmo servidor.
import http from 'http';
// Garante que o banco/tabelas existam antes de abrir a porta.
import { ensureDatabaseSchema } from './bootstrap/ensureSchema.js';
// Carrega variaveis de ambiente normalizadas.
import { env } from './config/env.js';
// Anexa o WebSocket usado pelo KDS/cozinha.
import { attachKitchenWebSocket } from './realtime/kitchenHub.js';

// Define a porta do backend, com 3006 como padrao.
const PORT = Number(env.PORT) || 3006;

// Inicializa banco, HTTP e WebSocket.
const startServer = async () => {
  try {
    // Cria/ajusta schema antes de aceitar requisicoes.
    await ensureDatabaseSchema();

    // Cria servidor HTTP a partir do app Express.
    const server = http.createServer(app);
    // Registra endpoint WebSocket /ws/kitchen no mesmo servidor.
    attachKitchenWebSocket(server);

    // Comeca a escutar conexoes HTTP/WebSocket.
    server.listen(PORT, () => {
      // Log operacional da API.
      console.log(`Servidor rodando na porta ${PORT}`);
      // Log operacional do canal em tempo real.
      console.log(`KDS WebSocket ativo em ws://localhost:${PORT}/ws/kitchen`);
    });
  } catch (error) {
    // Falha de boot precisa derrubar o processo para nao operar parcialmente.
    console.error('Erro ao iniciar o servidor:', error);
    // Codigo 1 sinaliza erro para shell/PM2/Docker.
    process.exit(1);
  }
};

// Executa o boot da aplicacao.
startServer();
