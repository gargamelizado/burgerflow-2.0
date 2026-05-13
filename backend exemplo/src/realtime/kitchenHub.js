/**
 * @file kitchenHub.js
 * @description Canal WebSocket usado para eventos em tempo real da cozinha, expedição e caixa.
 * @author BurgerFlow
 */

// Importa servidor WebSocket da biblioteca ws.
import { WebSocketServer } from 'ws';

// Guarda a instancia unica do WebSocket da cozinha/KDS.
let wss = null;

// Anexa o canal WebSocket ao servidor HTTP principal.
export function attachKitchenWebSocket(server) {
  // Cria servidor WebSocket no path dedicado do KDS.
  wss = new WebSocketServer({ server, path: '/ws/kitchen' });

  // Configura comportamento para cada nova conexao.
  wss.on('connection', (socket) => {
    // Confirma conexao para o frontend saber que tempo real esta ativo.
    socket.send(JSON.stringify({ type: 'connected', channel: 'kitchen' }));
  });
}

// Envia evento para todos os displays conectados.
export function broadcastKitchenEvent(type, payload) {
  // Se o WebSocket ainda nao foi anexado, ignora silenciosamente.
  if (!wss) return;

  // Padroniza envelope do evento com tipo, payload e timestamp.
  const message = JSON.stringify({ type, payload, sent_at: new Date().toISOString() });

  // Percorre todos os clientes conectados.
  for (const client of wss.clients) {
    // Envia apenas para conexoes abertas.
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}
