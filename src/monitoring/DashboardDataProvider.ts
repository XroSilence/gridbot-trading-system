import { 
  TradingState, 
  PerformanceMetrics, 
  HistoricalTrade,
  GridLevel 
} from '../types';
import { TradingBot } from '../core/TradingBot';
import { PerformanceMonitor } from './PerformanceMonitor';
import logger from '../utils/logger';
import EventEmitter from 'events';

/**
 * Dashboard Data Provider responsible for providing data to the UI dashboard
 */
export class DashboardDataProvider extends EventEmitter {
  private tradingBot: TradingBot;
  private performanceMonitor: PerformanceMonitor;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastTradingState: TradingState | null = null;
  private lastMetrics: PerformanceMetrics | null = null;

  constructor(tradingBot: TradingBot, performanceMonitor: PerformanceMonitor) {
    super();
    this.tradingBot = tradingBot;
    this.performanceMonitor = performanceMonitor;
  }

  /**
   * Start emitting dashboard data updates at regular intervals
   * @param intervalMs Interval in milliseconds (default: 1 second)
   */
  public startUpdates(intervalMs: number = 1000): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      this.emitUpdates();
    }, intervalMs);
    
    logger.info(`Dashboard data updates started with interval: ${intervalMs}ms`);
  }

  /**
   * Stop emitting dashboard data updates
   */
  public stopUpdates(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Dashboard data updates stopped');
    }
  }

  /**
   * Emit updates for the dashboard
   */
  private emitUpdates(): void {
    try {
      // Get current trading state and performance metrics
      const tradingState = this.tradingBot.getTradingState();
      const performanceMetrics = this.tradingBot.getPerformanceMetrics();
      
      // Check if data has changed
      const stateChanged = !this.lastTradingState || 
        JSON.stringify(tradingState) !== JSON.stringify(this.lastTradingState);
      
      const metricsChanged = !this.lastMetrics || 
        JSON.stringify(performanceMetrics) !== JSON.stringify(this.lastMetrics);
      
      // Only emit updates if data has changed
      if (stateChanged) {
        this.lastTradingState = tradingState;
        this.emit('tradingStateUpdate', tradingState);
      }
      
      if (metricsChanged) {
        this.lastMetrics = performanceMetrics;
        
        // Update performance monitor
        this.performanceMonitor.updateMetrics(performanceMetrics);
        
        // Emit update
        this.emit('metricsUpdate', performanceMetrics);
      }
      
      // Check for new trades
      const historicalTrades = this.tradingBot.getHistoricalTrades();
      if (historicalTrades.length > 0) {
        this.performanceMonitor.updateTrades(historicalTrades);
        this.emit('tradesUpdate', historicalTrades);
      }
    } catch (error) {
      logger.error('Failed to emit dashboard updates', error);
    }
  }

  /**
   * Get current grid visualization data
   */
  public getGridVisualizationData(): any {
    const tradingState = this.tradingBot.getTradingState();
    
    if (!tradingState) {
      return {
        currentPrice: 0,
        gridLevels: [],
        activeOrders: []
      };
    }
    
    // Create simplified representation of grid levels for visualization
    const gridVisualization = tradingState.gridLevels.map(level => ({
      price: level.price,
      isActive: level.isActive,
      hasBuyOrder: !!level.buyOrder,
      hasSellOrder: !!level.sellOrder
    }));
    
    return {
      currentPrice: tradingState.currentPrice,
      gridLevels: gridVisualization,
      activeOrders: tradingState.activeOrders.map(order => ({
        id: order.id,
        price: order.price,
        size: order.size,
        side: order.side,
        status: order.status
      }))
    };
  }

  /**
   * Get performance metrics summary
   */
  public getPerformanceMetricsSummary(): any {
    const metrics = this.tradingBot.getPerformanceMetrics();
    const metricsHistory = this.performanceMonitor.getMetricsHistory();
    
    // Calculate metrics trends
    const currentUnrealizedPnL = metrics.unrealizedPnL;
    const currentRealizedPnL = metrics.realizedPnL;
    const totalPnL = currentUnrealizedPnL + currentRealizedPnL;
    
    // Get historical metrics for trend calculation
    const historicalMetrics = metricsHistory.slice(-100); // Last 100 data points
    
    // Calculate trends
    let pnlTrend = 0;
    if (historicalMetrics.length > 1) {
      const oldestMetric = historicalMetrics[0];
      const oldTotalPnL = (oldestMetric as any).unrealizedPnL + (oldestMetric as any).realizedPnL;
      pnlTrend = totalPnL - oldTotalPnL;
    }
    
    return {
      currentMetrics: metrics,
      pnlTrend,
      historicalMetrics: historicalMetrics
    };
  }

  /**
   * Get trade analysis summary
   */
  public getTradeAnalysisSummary(): any {
    const historicalTrades = this.performanceMonitor.getHistoricalTrades();
    const tradingState = this.tradingBot.getTradingState();
    
    // Get profitability heatmap
    const profitabilityHeatmap = this.performanceMonitor.generateProfitabilityHeatmap(tradingState);
    
    // Get trade frequency stats
    const tradeFrequencyStats = this.performanceMonitor.calculateTradeFrequencyStats();
    
    // Get stop loss report
    const stopLossReport = this.performanceMonitor.generateStopLossReport();
    
    // Calculate most profitable price levels
    const profitableLevels = [...profitabilityHeatmap]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
    
    return {
      tradeCount: historicalTrades.length,
      profitableLevelsCount: profitabilityHeatmap.filter(level => level.profit > 0).length,
      unprofitableLevelsCount: profitabilityHeatmap.filter(level => level.profit <= 0).length,
      mostProfitableLevels: profitableLevels,
      tradeFrequencyStats,
      stopLossReport,
      recentTrades: historicalTrades.slice(-10) // Last 10 trades
    };
  }

  /**
   * Get bot status summary
   */
  public getBotStatusSummary(): any {
    return {
      isActive: this.tradingBot.isActive(),
      currentPrice: this.lastTradingState?.currentPrice || 0,
      unrealizedPnL: this.lastTradingState?.unrealizedPnL || 0,
      realizedPnL: this.lastTradingState?.realizedPnL || 0,
      activeOrdersCount: this.lastTradingState?.activeOrders.length || 0,
      filledOrdersCount: this.lastTradingState?.filledOrders.length || 0,
      currentStopLossLevel: this.lastTradingState?.currentStopLossLevel || 0
    };
  }
}


// Type definitions for events
interface DashboardEvents {
  tradingStateUpdate: (state: TradingState) => void;
  metricsUpdate: (metrics: PerformanceMetrics) => void;
  tradesUpdate: (trades: HistoricalTrade[]) => void;
}

// Override the emit method for type safety
public emit<K extends keyof DashboardEvents>(
  event: K, 
  ...args: Parameters<DashboardEvents[K]>
): boolean {
  return super.emit(event, ...args);
}

// Type-safe method to listen to events
public on<K extends keyof DashboardEvents>(
  event: K, 
  listener: DashboardEvents[K]
): this {
  return super.on(event, listener as (...args: any[]) => void);
}


/**
 * Get current grid visualization data with proper return type
 */
public getGridVisualizationData(): GridVisualizationData {
  const tradingState = this.tradingBot.getTradingState();
  
  if (!tradingState) {
    return {
      currentPrice: 0,
      gridLevels: [],
      activeOrders: []
    };
  }
  
  // Create simplified representation of grid levels for visualization
  const gridVisualization = tradingState.gridLevels.map(level => ({
    price: level.price,
    isActive: level.isActive,
    hasBuyOrder: !!level.buyOrder,
    hasSellOrder: !!level.sellOrder
  }));
  
  return {
    currentPrice: tradingState.currentPrice,
    gridLevels: gridVisualization,
    activeOrders: tradingState.activeOrders.map(order => ({
      id: order.id,
      price: order.price,
      size: order.size,
      side: order.side,
      status: order.status
    }))
  };
}

/**
 * Get performance metrics summary with proper return type
 */
public getPerformanceMetricsSummary(): PerformanceMetricsSummary {
  const metrics = this.tradingBot.getPerformanceMetrics();
  const metricsHistory = this.performanceMonitor.getMetricsHistory();
  
  // Calculate metrics trends
  const currentUnrealizedPnL = metrics.unrealizedPnL;
  const currentRealizedPnL = metrics.realizedPnL;
  const totalPnL = currentUnrealizedPnL + currentRealizedPnL;
  
  // Get historical metrics for trend calculation
  const historicalMetrics = metricsHistory.slice(-100); // Last 100 data points
  
  // Calculate trends
  let pnlTrend = 0;
  if (historicalMetrics.length > 1) {
    const oldestMetric = historicalMetrics[0];
    const oldTotalPnL = oldestMetric.unrealizedPnL + oldestMetric.realizedPnL;
    pnlTrend = totalPnL - oldTotalPnL;
  }
  
  return {
    currentMetrics: metrics,
    pnlTrend,
    historicalMetrics: historicalMetrics
  };
}

/**
 * Get bot status summary with proper return type
 */
public getBotStatusSummary(): BotStatusSummary {
  return {
    isActive: this.tradingBot.isActive(),
    currentPrice: this.lastTradingState?.currentPrice || 0,
    unrealizedPnL: this.lastTradingState?.unrealizedPnL || 0,
    realizedPnL: this.lastTradingState?.realizedPnL || 0,
    activeOrdersCount: this.lastTradingState?.activeOrders.length || 0,
    filledOrdersCount: this.lastTradingState?.filledOrders.length || 0,
    currentStopLossLevel: this.lastTradingState?.currentStopLossLevel || 0
  };
}

/**
 * Get trade analysis summary with proper return type
 */
public getTradeAnalysisSummary(): TradeAnalysisSummary {
  const historicalTrades = this.performanceMonitor.getHistoricalTrades();
  const tradingState = this.tradingBot.getTradingState();
  
  // Get profitability heatmap
  const profitabilityHeatmap = this.performanceMonitor.generateProfitabilityHeatmap(tradingState);
  
  // Get trade frequency stats
  const tradeFrequencyStats = this.performanceMonitor.calculateTradeFrequencyStats();
  
  // Get stop loss report
  const stopLossReport = this.performanceMonitor.generateStopLossReport();
  
  // Calculate most profitable price levels
  const profitableLevels = [...profitabilityHeatmap]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
  
  return {
    tradeCount: historicalTrades.length,
    profitableLevelsCount: profitabilityHeatmap.filter(level => level.profit > 0).length,
    unprofitableLevelsCount: profitabilityHeatmap.filter(level => level.profit <= 0).length,
    mostProfitableLevels: profitableLevels,
    tradeFrequencyStats,
    stopLossReport,
    recentTrades: historicalTrades.slice(-10) // Last 10 trades
  };
}
