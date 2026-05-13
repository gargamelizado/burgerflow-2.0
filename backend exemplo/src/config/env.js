/**
 * @file env.js
 * @description Carrega e normaliza variaveis de ambiente do backend BurgerFlow.
 * @author BurgerFlow
 */

// Carrega variaveis de ambiente do arquivo backend/.env.
import dotenv from 'dotenv';
// Resolve caminhos de forma portavel.
import path from 'path';
// Converte import.meta.url em caminho local.
import { fileURLToPath } from 'url';

// Caminho absoluto do arquivo .env do backend.
const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
// Aplica o .env ao process.env.
dotenv.config({ path: envFilePath });

// Variaveis obrigatorias para o backend conseguir conectar ao MySQL.
const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_USER', 'DB_NAME'];

// Valida ambiente antes do boot da aplicacao.
export function validateEnv() {
  // Lista variaveis ausentes ou vazias.
  const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim());

  // Interrompe o boot com mensagem acionavel quando faltar configuracao.
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Variaveis de ambiente ausentes: ${missingEnvVars.join(', ')}. Crie o arquivo backend/.env com base em backend/.env.example.`
    );
  }
}

// Objeto unico de configuracao consumido pelo restante do backend.
export const env = {
  // Host do banco MySQL.
  DB_HOST: process.env.DB_HOST?.trim(),
  // Usuario do banco MySQL.
  DB_USER: process.env.DB_USER?.trim(),
  // Senha do banco MySQL, permitindo string vazia em ambiente local.
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  // Nome do database principal.
  DB_NAME: process.env.DB_NAME?.trim(),
  // Porta HTTP do backend.
  PORT: process.env.PORT?.trim() || '3006',
  // Segredo JWT; fallback apenas para desenvolvimento.
  JWT_SECRET: process.env.JWT_SECRET?.trim() || 'seu_segredo_jwt',
  // Perfil de negocio; BurgerFlow usa fast_food por padrao.
  BUSINESS_TYPE: process.env.BUSINESS_TYPE?.trim() || 'fast_food',
  // Modo do provedor de cartao.
  CARD_PROVIDER_MODE: process.env.CARD_PROVIDER_MODE?.trim() || 'sandbox',
  // Provedor de cartao atual.
  CARD_PROVIDER: process.env.CARD_PROVIDER?.trim() || 'mock',
  // Nome comercial exibido em documentacoes/respostas.
  APP_NAME: process.env.APP_NAME?.trim() || 'BurgerFlow ERP',
  // Slogan legado usado por telas/documentos.
  APP_SLOGAN: process.env.APP_SLOGAN?.trim() || 'PDV multi-negocio para fast-food, varejo e farmacia.'
};
