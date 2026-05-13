/**
 * @file nodeRed.service.js
<<<<<<< HEAD
 * @description Servico de integracao opcional com Node-RED.
=======
 * @description Service da integracao basica com Node-RED. Faz health check e teste sem impactar fluxos criticos.
 * @author BurgerFlow
>>>>>>> 65c17b1 (ok)
 */

import nodeRedConfig from '../../config/nodeRed.js';

class NodeRedService {
<<<<<<< HEAD
  isEnabled() {
    return Boolean(nodeRedConfig.enabled);
  }

  async callFlow(path, payload = {}, options = {}) {
    if (!this.isEnabled()) {
      return {
        success: false,
        warning: 'Integração Node-RED desativada.',
        skipped: true,
      };
    }

    const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const response = await fetch(`${nodeRedConfig.baseUrl}${normalizedPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-burgerflow-secret': nodeRedConfig.secret,
        },
        body: JSON.stringify(payload ?? {}),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        return {
          success: false,
          warning: 'Node-RED respondeu com erro.',
          status: response.status,
          data,
        };
      }

      return {
        success: true,
        status: response.status,
        data,
      };
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      return {
        success: false,
        warning: isAbort
          ? 'Timeout ao chamar Node-RED.'
          : 'Falha ao conectar com Node-RED.',
        error: error?.message || 'Erro desconhecido.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async testConnection() {
    return this.callFlow('/burgerflow/teste', {
      source: 'burgerflow',
      event: 'connection_test',
      timestamp: new Date().toISOString(),
    });
  }
}

const nodeRedService = new NodeRedService();
export default nodeRedService;
=======
  getBaseStatus() {
    const configured = Boolean(nodeRedConfig.url && nodeRedConfig.secret);

    return {
      enabled: nodeRedConfig.enabled,
      configured,
      url: nodeRedConfig.url,
      timeout_ms: nodeRedConfig.timeoutMs,
      secret_header: 'x-burgerflow-secret'
    };
  }

  async getStatus() {
    const baseStatus = this.getBaseStatus();

    if (!baseStatus.enabled) {
      return {
        ...baseStatus,
        ok: false,
        reachable: false,
        message: 'Integração com Node-RED desabilitada por configuração.'
      };
    }

    if (!baseStatus.configured) {
      return {
        ...baseStatus,
        ok: false,
        reachable: false,
        message: 'Integração com Node-RED habilitada, mas URL ou segredo não foram configurados.'
      };
    }

    const probe = await this.requestNodeRed({
      path: '/',
      method: 'GET'
    });

    return {
      ...baseStatus,
      ok: probe.ok,
      reachable: probe.reachable,
      status_code: probe.status_code,
      message: probe.message
    };
  }

  async sendTest(payload = {}, context = {}) {
    const baseStatus = this.getBaseStatus();

    if (!baseStatus.enabled) {
      return {
        ...baseStatus,
        ok: false,
        skipped: true,
        reachable: false,
        message: 'Integração com Node-RED desabilitada. Nenhuma chamada foi enviada.'
      };
    }

    if (!baseStatus.configured) {
      return {
        ...baseStatus,
        ok: false,
        skipped: true,
        reachable: false,
        message: 'Integração com Node-RED habilitada, mas URL ou segredo não foram configurados.'
      };
    }

    const requestPayload = {
      event: 'burgerflow.node_red_test',
      app: nodeRedConfig.appName,
      source: 'burgerflow-backend',
      timestamp: new Date().toISOString(),
      user_id: context.userId || null,
      user_name: context.userName || null,
      payload
    };

    const response = await this.requestNodeRed({
      path: '/burgerflow/teste',
      method: 'POST',
      payload: requestPayload
    });

    return {
      ...baseStatus,
      ...response
    };
  }

  async requestNodeRed({ path = '/', method = 'GET', payload = null } = {}) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), nodeRedConfig.timeoutMs);
    const requestUrl = new URL(path.replace(/^\//, ''), `${nodeRedConfig.url}/`).toString();

    try {
      const response = await fetch(requestUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-burgerflow-secret': nodeRedConfig.secret
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal
      });

      const data = await this.parseResponseBody(response);

      return {
        ok: response.ok,
        skipped: false,
        reachable: true,
        url: requestUrl,
        status_code: response.status,
        data,
        message: response.ok
          ? 'Node-RED respondeu com sucesso.'
          : `Node-RED respondeu com status ${response.status}.`
      };
    } catch (error) {
      const isTimeout = error?.name === 'AbortError';

      return {
        ok: false,
        skipped: false,
        reachable: false,
        url: requestUrl,
        status_code: null,
        data: null,
        error: error?.message || 'Falha desconhecida ao chamar Node-RED.',
        message: isTimeout
          ? `Node-RED não respondeu em ${nodeRedConfig.timeoutMs}ms.`
          : 'Não foi possível conectar ao Node-RED.'
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  async parseResponseBody(response) {
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('application/json')) {
      return response.json().catch(() => null);
    }

    return response.text().catch(() => null);
  }
}

export default new NodeRedService();
>>>>>>> 65c17b1 (ok)
