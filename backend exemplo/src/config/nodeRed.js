/**
 * @file nodeRed.js
<<<<<<< HEAD
 * @description Configuracao da integracao opcional com Node-RED.
 */

const nodeRedConfig = {
  enabled: process.env.NODE_RED_ENABLED === 'true',
  baseUrl: (process.env.NODE_RED_URL || 'http://127.0.0.1:1880').replace(/\/$/, ''),
  secret: process.env.NODE_RED_SECRET || '',
=======
 * @description Centraliza a configuracao basica da integracao opcional com Node-RED.
 * @author BurgerFlow
 */

import { env } from './env.js';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEFAULT_NODE_RED_URL = 'http://127.0.0.1:1880';
const DEFAULT_TIMEOUT_MS = 5000;

function normalizeBoolean(value) {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

function normalizeUrl(value) {
  const trimmedValue = String(value || '').trim();

  if (!trimmedValue) {
    return DEFAULT_NODE_RED_URL;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    return parsedUrl.toString().replace(/\/$/, '');
  } catch (_error) {
    return trimmedValue.replace(/\/$/, '');
  }
}

export const nodeRedConfig = {
  enabled: normalizeBoolean(process.env.NODE_RED_ENABLED ?? 'false'),
  url: normalizeUrl(process.env.NODE_RED_URL),
  secret: String(process.env.NODE_RED_SECRET || '').trim(),
  timeoutMs: DEFAULT_TIMEOUT_MS,
  appName: env.APP_NAME
>>>>>>> 65c17b1 (ok)
};

export default nodeRedConfig;
