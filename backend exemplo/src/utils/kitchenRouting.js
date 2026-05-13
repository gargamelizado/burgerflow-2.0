/**
 * @file kitchenRouting.js
 * @description Utilitarios para normalizar e resolver a estacao operacional de itens da cozinha.
 * @author BurgerFlow
 */

export const KITCHEN_STATIONS = new Set(['chapa', 'fritadeira', 'bebidas', 'sobremesa', 'montagem', 'expedicao']);

export const KITCHEN_SECTION_STATIONS = {
  cozinha: ['chapa', 'fritadeira'],
  bebidas: ['bebidas'],
  sobremesa: ['sobremesa'],
  montagem: ['montagem']
};

/**
 * Normaliza texto de roteamento removendo acentos e padronizando para minusculo.
 * @param {string} value - Texto de origem.
 * @returns {string}
 */
export const normalizeRoutingText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

/**
 * Converte uma entrada livre para uma estacao de cozinha conhecida.
 * @param {string} value - Valor informado pelo produto ou UI.
 * @returns {string|null}
 */
export function normalizeKitchenStation(value) {
  const station = normalizeRoutingText(value).replace(/[^a-z0-9_]/g, '_');
  return KITCHEN_STATIONS.has(station) ? station : null;
}

/**
 * Resolve a estacao de preparo de um produto usando campo explicito e heuristicas de categoria/tipo/nome.
 * @param {Object} product - Produto ou item de venda com dados de roteamento.
 * @returns {string}
 */
export function resolveKitchenStation(product = {}) {
  const explicitStation = normalizeKitchenStation(product.preparation_station || product.estacao_cozinha || product.station);
  if (explicitStation) return explicitStation;

  const category = normalizeRoutingText(product.categoria || product.category);
  const type = normalizeRoutingText(product.tipo || product.type);
  const name = normalizeRoutingText(product.nome || product.name);
  const searchable = `${category} ${type} ${name}`;

  if (type === 'combo' || category.includes('combo')) return 'montagem';
  if (type === 'bebida' || /bebida|refrigerante|suco|agua|cafe|cha/.test(searchable)) return 'bebidas';
  if (type === 'sobremesa' || /sobremesa|sorvete|sundae|milkshake|doce|brownie|casquinha/.test(searchable)) return 'sobremesa';
  if (/batata|frita|fritura|nugget|frango|acompanhamento/.test(searchable)) return 'fritadeira';
  if (/hamburg|burger|lanche|smash|carne|bacon|chapa/.test(searchable)) return 'chapa';

  return 'expedicao';
}

/**
 * Resolve a secao informada para uma ou mais estacoes reais que podem receber pedido devolvido.
 * @param {string} value - Secao ou estacao informada na requisicao.
 * @returns {string[]}
 */
export function resolveReturnStations(value) {
  const normalized = normalizeRoutingText(value).replace(/[^a-z0-9_]/g, '_');
  if (KITCHEN_SECTION_STATIONS[normalized]) return KITCHEN_SECTION_STATIONS[normalized];

  const station = normalizeKitchenStation(normalized);
  return station && station !== 'expedicao' ? [station] : [];
}
