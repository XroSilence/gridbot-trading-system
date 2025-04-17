/**
 * Types for the Customizable Neutral Gridbot Trading System
 */

// Asset pair type (e.g., BTC/USD)
export type AssetPair = string;

// Grid distribution methods
export enum GridDistributionMethod {
  LINEAR = 'linear',
  ARITHMETIC = 'arithmetic',
  GEOMETRIC = 'geometric',
  VOLATILITY_BASED = 'volatility-based'
}

// Order allocation methods
export enum OrderAllocationMethod {
  EQUAL = 'equal',
  WEIGHTED = 'weighted',
  CUSTOM = 'custom'
}

// Stop loss implementation methods
export enum StopLossMethod {
  HARD = 'hard',
  SOFT = 'soft'
}

// Grid adjustment triggers
export enum GridAdjustmentTrigger {
  TIME_BASED = 'time-based',
  VOLATILITY_BASED = 'volatility-based',
  PROFIT_THRESHOLD = 'profit-threshold'
}

// Order types
export enum OrderType {
  LIMIT = 'limit',
  CONDITIONAL = 'conditional'
}

// Investment configuration
export interface InvestmentConfig {
  totalInvestment: number;
  assetPair: AssetPair;
  leverage: number;
}

// Grid configuration
export interface GridConfig {
  numberOfGrids: number;
  upperBound: number;
  lowerBound: number;
  autoRange: boolean;
  distributionMethod: GridDistributionMethod;
}

// Order configuration
export interface OrderConfig {
  allocationMethod: OrderAllocationMethod;
  customAllocationPattern?: number[];
  orderType: OrderType;
  conditionalRules?: any[]; // To be defined based on specific conditional rules
}

// Basic stop loss configuration
export interface BasicStopLossConfig {
  enabled: boolean;
  percentage: number;
  method: StopLossMethod;
}

// Dynamic stop loss configuration
export interface DynamicStopLossConfig {
  enabled: boolean;
  initialRiskThreshold: number;
  expansionFactor: number;
  maximumExpansion: number;
}

// Trailing stop loss configuration
export interface TrailingStopLossConfig {
  enabled: boolean;
  trailingDistance: number;
  activationThreshold: number;
  isDiscrete: boolean;
}

// Risk management configuration
export interface RiskManagementConfig {
  basicStopLoss: BasicStopLossConfig;
  dynamicStopLoss: DynamicStopLossConfig;
  trailingStopLoss: TrailingStopLossConfig;
}

// Grid adjustment configuration
export interface GridAdjustmentConfig {
  enabled: boolean;
  trigger: GridAdjustmentTrigger;
  timeInterval?: number; // In milliseconds, for time-based adjustments
  volatilityThreshold?: number; // For volatility-based adjustments
  profitThreshold?: number; // For profit threshold adjustments
}

// Position management configuration
export interface PositionManagementConfig {
  rebalancingEnabled: boolean;
  driftCorrectionEnabled: boolean;
  gridAdjustment: GridAdjustmentConfig;
}

// Full trading bot configuration
export interface TradingBotConfig {
  investment: InvestmentConfig;
  grid: GridConfig;
  order: OrderConfig;
  riskManagement: RiskManagementConfig;
  positionManagement: PositionManagementConfig;
}

// Grid level order
export interface GridOrder {
  id: string;
  price: number;
  size: number;
  type: OrderType;
  side: 'buy' | 'sell';
  status: 'pending' | 'filled' | 'canceled';
  exchangeOrderId?: string;
}

// Grid level
export interface GridLevel {
  price: number;
  buyOrder?: GridOrder;
  sellOrder?: GridOrder;
  isActive: boolean;
}

// Bot trading state
export interface TradingState {
  currentPrice: number;
  gridLevels: GridLevel[];
  activeOrders: GridOrder[];
  filledOrders: GridOrder[];
  unrealizedPnL: number;
  realizedPnL: number;
  currentStopLossLevel: number;
}

// Performance metrics
export interface PerformanceMetrics {
  unrealizedPnL: number;
  realizedPnL: number;
  gridUtilizationPercentage: number;
  riskExposure: number;
  currentStopLossLevel: number;
  tradeCount: number;
  successRate: number;
}

// Historical trade data
export interface HistoricalTrade {
  timestamp: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  gridLevel: number;
  profit: number;
}

// Exchange API connection configuration
export interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  additionalParams?: Record<string, any>;
}


// Extended performance metrics with timestamp for historical tracking
export interface TimestampedMetrics extends PerformanceMetrics {
  timestamp: number;
}

// Dashboard data related types
export interface GridVisualizationData {
  currentPrice: number;
  gridLevels: {
    price: number;
    isActive: boolean;
    hasBuyOrder: boolean;
    hasSellOrder: boolean;
  }[];
  activeOrders: {
    id: string;
    price: number;
    size: number;
    side: 'buy' | 'sell';
    status: string;
  }[];
}

export interface BotStatusSummary {
  isActive: boolean;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  activeOrdersCount: number;
  filledOrdersCount: number;
  currentStopLossLevel: number;
}

export interface PerformanceMetricsSummary {
  currentMetrics: PerformanceMetrics;
  pnlTrend: number;
  historicalMetrics: TimestampedMetrics[];
}

export interface TradeAnalysisSummary {
  tradeCount: number;
  profitableLevelsCount: number;
  unprofitableLevelsCount: number;
  mostProfitableLevels: {
    price: number;
    tradeCount: number;
    profit: number;
    profitPerTrade: number;
  }[];
  tradeFrequencyStats: {
    tradesPerHour: number;
    tradesPerDay: number;
    averageTimeBetweenTrades: number;
    totalTrades: number;
  };
  stopLossReport: {
    stopLossTradeCount: number;
    regularTradeCount: number;
    stopLossTotalLoss: number;
    regularTradesTotalProfit: number;
    netPnL: number;
    effectivenessRatio: number;
  };
  recentTrades: HistoricalTrade[];
}
