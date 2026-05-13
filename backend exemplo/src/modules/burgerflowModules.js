/**
 * @file burgerflowModules.js
 * @description Manifesto de arquitetura alvo do BurgerFlow, agrupando dominios e responsabilidades planejadas.
 * @author BurgerFlow
 */

// Manifesto lógico dos módulos do BurgerFlow.
// Este arquivo documenta a arquitetura alvo sem acoplar a API atual a 200 classes vazias.
export const burgerflowModules = {
  // CORE concentra identidade, segurança, auditoria, loja, eventos e configurações globais.
  core: [
    'AuthService', 'UserService', 'RoleService', 'PermissionService', 'StoreService', 'SettingsService',
    'AuditService', 'NotificationService', 'EventBus', 'TenantResolver', 'SessionService',
    'PasswordPolicy', 'AccessTokenService', 'RefreshTokenService', 'FeatureFlagService',
    'DeviceRegistry', 'PrinterGateway', 'FiscalGateway', 'HealthCheck', 'ConfigSnapshot'
  ],
  // PDV cobre a tela de venda rápida, combos, descontos, carrinho operacional e pagamento.
  pdv: [
    'PdvScreen', 'ProductGrid', 'CategoryTabs', 'ComboBuilder', 'UpsellEngine', 'CartManager',
    'OrderDraftManager', 'ChannelSelector', 'DiscountGuard', 'PriceEngine', 'PromotionEngine',
    'QuickComboPad', 'OperatorShift', 'ReceiptPreview', 'CustomerIdentifier', 'TenderSelector',
    'PaymentSummary', 'SaleBlocker', 'CashLimitBanner', 'OfflineQueue'
  ],
  // PEDIDOS controla ciclo de vida, SLA, histórico, prioridade, cancelamento e retrabalho.
  pedidos: [
    'OrderService', 'OrderStatusManager', 'OrderItemService', 'OrderPriorityService', 'OrderHistory',
    'OrderNumberGenerator', 'OrderSlaClock', 'OrderCancellation', 'OrderErrorLog', 'OrderRetry',
    'OrderChannelRouter', 'OrderCompletionGuard', 'OrderReworkService', 'OrderMergeService',
    'OrderSplitService', 'OrderTagService', 'OrderTimeline', 'OrderAuditTrail', 'OrderRecovery',
    'OrderLoadSimulator'
  ],
  // PAGAMENTOS isola Pix, cartão, dinheiro, pagamentos mistos, estornos e integrações.
  pagamentos: [
    'PaymentService', 'PixService', 'CardService', 'CashService', 'MixedPayment', 'VoucherService',
    'PaymentAuthorization', 'PaymentReversal', 'PaymentReceipt', 'PaymentWebhook', 'PaymentSandbox',
    'TerminalRegistry', 'AcquirerAdapter', 'PaymentLedger', 'PaymentRiskRules', 'ChangeCalculator',
    'PaymentStatusSync', 'RefundService', 'PaymentAudit', 'PaymentFailureHandler'
  ],
  // CAIXA modela abertura, sangria, suprimento, fechamento, bloqueios e conferência.
  caixa: [
    'CashRegister', 'CashMovement', 'Sangria', 'CashAlert', 'CashOpening', 'CashClosing',
    'CashConference', 'CashLimitPolicy', 'CashDifferenceReason', 'CashReport', 'CashDrawer',
    'CashSupervisorApproval', 'CashTransfer', 'SafeDropSuggestion', 'CashBlocker', 'CashReconciliation',
    'CashOperatorSummary', 'CashAudit', 'CashSessionGuard', 'CashRealtimeNotifier'
  ],
  // COZINHA representa KDS, filas, timers, roteamento e sincronização em tempo real.
  cozinha: [
    'KitchenDisplay', 'StationRouter', 'StationView', 'ItemTimer', 'OrderQueue', 'KitchenOrderService',
    'KitchenLoadBalancer', 'KitchenSlaAlert', 'KitchenBatchPlanner', 'KitchenDisplayOnlyGuard',
    'KitchenBumpBar', 'KitchenPrinter', 'KitchenItemSequencer', 'KitchenStatusSync',
    'KitchenRecall', 'KitchenWasteRecorder', 'KitchenReworkQueue', 'KitchenCapacityMonitor',
    'KitchenShiftBoard', 'KitchenEventProjector'
  ],
  // ESTAÇÕES separa responsabilidades da linha: chapa, fritadeira, bebidas, montagem e expedição.
  estacoes: [
    'Grill', 'Fry', 'Drinks', 'Dessert', 'Assembly', 'Expedition', 'StationCapacity',
    'StationOperator', 'StationHandoff', 'StationBacklog', 'StationSla', 'StationDisplay',
    'StationPause', 'StationResume', 'StationRecipeHints', 'StationBatch', 'StationCleaning',
    'StationQualityCheck', 'StationErrorLog', 'StationPerformance'
  ],
  // EXPEDIÇÃO garante checklist, painel cliente, chamadas e bloqueio de entrega incompleta.
  expedicao: [
    'Checklist', 'PickupDisplay', 'VoiceCall', 'BagAssembler', 'CompletenessGuard',
    'CustomerPanel', 'NowSoonQueue', 'DeliveryHandoff', 'DriveThruHandoff', 'CounterPickup',
    'ExpeditionSla', 'ExpeditionRecall', 'ExpeditionIssueLog', 'ExpeditionSeal',
    'ExpeditionReceipt', 'ExpeditionOperatorScore', 'ExpeditionReadyNotifier',
    'ExpeditionCompletion', 'ExpeditionAudit', 'ExpeditionLoad'
  ],
  // DRIVE-THRU mede carro por carro, etapa por etapa, com alertas de janela.
  driveThru: [
    'DriveThruFlow', 'DriveThruTimer', 'DriveThruQueue', 'CarDetection', 'DriveThruStage',
    'DriveThruPayment', 'DriveThruProduction', 'DriveThruDelivery', 'DriveThruAlert',
    'DriveThruLane', 'DriveThruPerformance', 'DriveThruSla', 'DriveThruRecall',
    'DriveThruWindow', 'DriveThruOperator', 'DriveThruCustomerDisplay', 'DriveThruLoad',
    'DriveThruException', 'DriveThruAudit', 'DriveThruPredictor'
  ],
  // DELIVERY trata marketplace, fila de entrega, prioridade por atraso e handoff ao entregador.
  delivery: [
    'DeliveryFlow', 'DeliveryQueue', 'DeliveryStatus', 'MarketplaceWebhook', 'CourierHandoff',
    'DeliveryDelayPriority', 'DeliveryPackaging', 'DeliverySla', 'DeliveryCustomer',
    'DeliveryAddress', 'DeliveryCancellation', 'DeliveryRefund', 'DeliveryAudit',
    'DeliveryAggregatorAdapter', 'DeliveryReadyNotifier', 'DeliveryDispatch',
    'DeliveryHeatmap', 'DeliveryLoad', 'DeliveryException', 'DeliveryScore'
  ],
  // TOTEM cobre autoatendimento, pagamento, sessão, acessibilidade e falhas de terminal.
  totem: [
    'KioskScreen', 'KioskPaymentFlow', 'KioskMenu', 'KioskComboBuilder', 'KioskUpsell',
    'KioskSession', 'KioskTimeout', 'KioskReceipt', 'KioskAccessibility', 'KioskTheme',
    'KioskAvailability', 'KioskPaymentRetry', 'KioskOrderSender', 'KioskCustomerPanel',
    'KioskDiagnostics', 'KioskOffline', 'KioskAudit', 'KioskErrorLog', 'KioskLoad',
    'KioskSettings'
  ],
  // ESTOQUE trabalha por ingredientes, receitas, consumo automático, compras e desperdício.
  estoque: [
    'IngredientService', 'RecipeService', 'StockEngine', 'IngredientConsumption', 'StockAlert',
    'StockReplenishment', 'StockAdjustment', 'StockPurchase', 'StockWaste', 'StockCount',
    'StockMovementLedger', 'IngredientCost', 'RecipeCosting', 'StockForecast', 'StockMinimumPolicy',
    'StockSupplier', 'StockBatch', 'StockExpiration', 'StockAudit', 'StockDashboard'
  ],
  // HOLDING controla produção antecipada, validade, consumo, descarte e sugestão de reposição.
  holding: [
    'PreProduction', 'HoldingTimer', 'HoldingDiscard', 'HoldingCapacity', 'HoldingValidity',
    'HoldingSuggestion', 'HoldingBatch', 'HoldingConsumption', 'HoldingAudit', 'HoldingDisplay',
    'HoldingWaste', 'HoldingStationSync', 'HoldingTemperatureLog', 'HoldingRushMode',
    'HoldingForecast', 'HoldingRefill', 'HoldingRuleSet', 'HoldingNotification',
    'HoldingQualityCheck', 'HoldingReport'
  ],
  // INTELIGÊNCIA calcula demanda, gargalo, rush mode, batch, score e sugestão de produção.
  inteligencia: [
    'DemandPredictor', 'BottleneckDetector', 'RushMode', 'ProductionSuggestion',
    'BatchOptimizer', 'StoreScore', 'QueuePredictor', 'StationLoadPredictor',
    'WastePredictor', 'CashRiskDetector', 'DeliveryDelayDetector', 'DriveThruDelayDetector',
    'OperatorPerformanceModel', 'SlaTrend', 'DemandHeatmap', 'PrepTimeEstimator',
    'MenuMixAnalyzer', 'PreProductionAdvisor', 'AlertPrioritizer', 'SimulationEngine'
  ],
  // RELATÓRIOS consolida vendas, caixa, cozinha, operadores, desperdício, SLA e score.
  relatorios: [
    'SalesReport', 'PerformanceReport', 'OperatorReport', 'KitchenReport', 'CashReport',
    'WasteReport', 'CancellationReport', 'ReworkReport', 'SlaReport', 'DriveThruReport',
    'DeliveryReport', 'StockReport', 'StoreScoreReport', 'RushReport', 'HoldingReport',
    'AuditReport', 'PaymentReport', 'ProductMixReport', 'DemandReport', 'ExecutiveDashboard'
  ]
};

// Eventos WebSocket oficiais do fluxo em tempo real.
export const websocketEvents = [
  // Pedido criado no PDV, delivery, drive-thru ou totem.
  'order.created',
  // Item enviado para uma estação.
  'item.sent',
  // Item iniciado por uma estação.
  'item.started',
  // Item finalizado por uma estação.
  'item.ready',
  // Pedido entregue/concluído.
  'order.completed'
];
