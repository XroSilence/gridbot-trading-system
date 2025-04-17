import { 
  PerformanceMetrics, 
  HistoricalTrade, 
  GridLevel,
  TradingState 
} from '../types';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Performance Monitor class for tracking and analyzing bot performance
 */
export class PerformanceMonitor {
  private metricsHistory: PerformanceMetrics[] = [];
  private historicalTrades: HistoricalTrade[] = [];
  private saveDirectory: string;
  private maxHistoryLength: number;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(saveDirectory: string = 'data', maxHistoryLength: number = 1000) {
    this.saveDirectory = saveDirectory;
    this.maxHistoryLength = maxHistoryLength;
    
    // Create save directory if it doesn't exist
    if (!fs.existsSync(saveDirectory)) {
      fs.mkdirSync(saveDirectory, { recursive: true });
    }
    
    // Load previous data if it exists
    this.loadHistoricalData();
    
    logger.info(`Performance monitor initialized with save directory: ${saveDirectory}`);
  }

  /**
   * Update performance metrics
   * @param metrics Current performance metrics
   */
  public updateMetrics(metrics: PerformanceMetrics): void {
    // Add timestamp to metrics
    const timestampedMetrics = {
      ...metrics,
      timestamp: Date.now()
    };
    
    // Add to history and limit size
    this.metricsHistory.push(timestampedMetrics as any);
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Update historical trades
   * @param trades New historical trades
   */
  public updateTrades(trades: HistoricalTrade[]): void {
    // Add new trades to history
    this.historicalTrades = [
      ...this.historicalTrades,
      ...trades
    ];
    
    // Limit history size
    if (this.historicalTrades.length > this.maxHistoryLength) {
      this.historicalTrades = this.historicalTrades.slice(
        this.historicalTrades.length - this.maxHistoryLength
      );
    }
  }

  /**
   * Start automatically saving performance data at regular intervals
   * @param intervalMs Interval in milliseconds (default: 5 minutes)
   */
  public startAutoSave(intervalMs: number = 300000): void {
    // Clear any existing interval
    if (this.saveInterval !== null) {
      clearInterval(this.saveInterval);
    }
    
    // Set up new interval
    this.saveInterval = setInterval(() => {
      this.saveData();
    }, intervalMs);
    
    logger.info(`Auto-save enabled with interval: ${intervalMs}ms`);
  }

  /**
   * Stop auto-saving performance data
   */
  public stopAutoSave(): void {
    if (this.saveInterval !== null) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      logger.info('Auto-save disabled');
    }
  }

  /**
   * Save current performance data to disk
   */
  public saveData(): void {
    try {
      // Create filenames with timestamps
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const metricsFilename = path.join(this.saveDirectory, `metrics-${timestamp}.json`);
      const tradesFilename = path.join(this.saveDirectory, `trades-${timestamp}.json`);
      
      // Save metrics
      fs.writeFileSync(
        metricsFilename,
        JSON.stringify(this.metricsHistory, null, 2)
      );
      
      // Save trades
      fs.writeFileSync(
        tradesFilename,
        JSON.stringify(this.historicalTrades, null, 2)
      );
      
      logger.info(`Performance data saved to ${metricsFilename} and ${tradesFilename}`);
    } catch (error) {
      logger.error('Failed to save performance data', error);
    }
  }

  /**
   * Load historical data from disk
   */
  private loadHistoricalData(): void {
    try {
      // Find most recent files
      const files = fs.readdirSync(this.saveDirectory);
      
      const metricsFiles = files.filter(file => file.startsWith('metrics-'));
      const tradesFiles = files.filter(file => file.startsWith('trades-'));
      
      if (metricsFiles.length > 0) {
        // Sort by name (which includes timestamp) to get most recent
        metricsFiles.sort();
        const latestMetricsFile = path.join(
          this.saveDirectory,
          metricsFiles[metricsFiles.length - 1]
        );
        
        // Load metrics
        const metricsData = fs.readFileSync(latestMetricsFile, 'utf8');
        this.metricsHistory = JSON.parse(metricsData);
        
        logger.info(`Loaded performance metrics from ${latestMetricsFile}`);
      }
      
      if (tradesFiles.length > 0) {
        // Sort by name (which includes timestamp) to get most recent
        tradesFiles.sort();
        const latestTradesFile = path.join(
          this.saveDirectory,
          tradesFiles[tradesFiles.length - 1]
        );
        
        // Load trades
        const tradesData = fs.readFileSync(latestTradesFile, 'utf8');
        this.historicalTrades = JSON.parse(tradesData);
        
        logger.info(`Loaded historical trades from ${latestTradesFile}`);
      }
    } catch (error) {
      logger.error('Failed to load historical data', error);
    }
  }

  /**
   * Get performance metrics history
   */
  public getMetricsHistory(): any[] {
    return [...this.metricsHistory];
  }

  /**
   * Get historical trades
   */
  public getHistoricalTrades(): HistoricalTrade[] {
    return [...this.historicalTrades];
  }

  /**
   * Generate profitability heatmap analysis
   * @param tradingState Current trading state
   * @returns Heatmap data with profitability by price level
   */
  public generateProfitabilityHeatmap(tradingState: TradingState): any[] {
    // Create a mapping of price levels to trade counts and profits
    const profitabilityMap = new Map<number, { count: number; profit: number }>();
    
    // Initialize map with all grid levels
    tradingState.gridLevels.forEach(level => {
      profitabilityMap.set(level.price, { count: 0, profit: 0 });
    });
    
    // Aggregate trades by price level
    this.historicalTrades.forEach(trade => {
      const price = trade.price;
      const currentData = profitabilityMap.get(price) || { count: 0, profit: 0 };
      
      profitabilityMap.set(price, {
        count: currentData.count + 1,
        profit: currentData.profit + trade.profit
      });
    });
    
    // Convert map to array of objects for visualization
    const heatmapData = Array.from(profitabilityMap.entries()).map(([price, data]) => ({
      price,
      tradeCount: data.count,
      profit: data.profit,
      profitPerTrade: data.count > 0 ? data.profit / data.count : 0
    }));
    
    // Sort by price
    heatmapData.sort((a, b) => a.price - b.price);
    
    return heatmapData;
  }

  /**
   * Calculate trade frequency statistics
   * @returns Statistics on trade frequency
   */
  public calculateTradeFrequencyStats(): any {
    if (this.historicalTrades.length === 0) {
      return {
        tradesPerHour: 0,
        tradesPerDay: 0,
        averageTimeBetweenTrades: 0
      };
    }
    
    // Sort trades by timestamp
    const sortedTrades = [...this.historicalTrades].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    
    // Calculate time range
    const startTime = sortedTrades[0].timestamp;
    const endTime = sortedTrades[sortedTrades.length - 1].timestamp;
    const timeRangeHours = (endTime - startTime) / (1000 * 60 * 60);
    const timeRangeDays = timeRangeHours / 24;
    
    // Calculate trade frequency
    const tradesPerHour = timeRangeHours > 0 ? 
      sortedTrades.length / timeRangeHours : 0;
    
    const tradesPerDay = timeRangeDays > 0 ? 
      sortedTrades.length / timeRangeDays : 0;
    
    // Calculate average time between trades
    let totalTimeBetween = 0;
    for (let i = 1; i < sortedTrades.length; i++) {
      const timeBetween = sortedTrades[i].timestamp - sortedTrades[i - 1].timestamp;
      totalTimeBetween += timeBetween;
    }
    
    const averageTimeBetweenTrades = sortedTrades.length > 1 ? 
      totalTimeBetween / (sortedTrades.length - 1) : 0;
    
    return {
      tradesPerHour,
      tradesPerDay,
      averageTimeBetweenTrades,
      totalTrades: sortedTrades.length
    };
  }

  /**
   * Generate stop loss effectiveness report
   * @returns Report on stop loss effectiveness
   */
  public generateStopLossReport(): any {
    // Count number of stop loss events (trades with negative profit close to stop loss level)
    const stopLossTrades = this.historicalTrades.filter(trade => {
      // Consider trades with negative profit as potential stop loss trades
      return trade.profit < 0;
    });
    
    // Get total loss from stop loss trades vs. regular trades
    const stopLossTotalLoss = stopLossTrades.reduce(
      (sum, trade) => sum + trade.profit, 
      0
    );
    
    const regularTrades = this.historicalTrades.filter(trade => trade.profit >= 0);
    const regularTradesTotalProfit = regularTrades.reduce(
      (sum, trade) => sum + trade.profit, 
      0
    );
    
    // Overall effectiveness ratio
    const netPnL = regularTradesTotalProfit + stopLossTotalLoss;
    const effectivenessRatio = stopLossTotalLoss !== 0 ? 
      Math.abs(regularTradesTotalProfit / stopLossTotalLoss) : 0;
    
    return {
      stopLossTradeCount: stopLossTrades.length,
      regularTradeCount: regularTrades.length,
      stopLossTotalLoss,
      regularTradesTotalProfit,
      netPnL,
      effectivenessRatio
    };
  }
}


// Type-safe interface implementations

/**
 * Update performance metrics with proper typing
 */
public updateMetrics(metrics: PerformanceMetrics): void {
  // Add timestamp to metrics
  const timestampedMetrics: TimestampedMetrics = {
    ...metrics,
    timestamp: Date.now()
  };
  
  // Add to history and limit size
  this.metricsHistory.push(timestampedMetrics);
  if (this.metricsHistory.length > this.maxHistoryLength) {
    this.metricsHistory.shift();
  }
}

/**
 * Get metrics history with proper return type
 */
public getMetricsHistory(): TimestampedMetrics[] {
  return [...this.metricsHistory];
}

/**
 * Get historical trades with proper return type
 */
public getHistoricalTrades(): HistoricalTrade[] {
  return [...this.historicalTrades];
}

/**
 * Generate profitability heatmap analysis with proper return type
 */
public generateProfitabilityHeatmap(tradingState: TradingState): {
  price: number;
  tradeCount: number;
  profit: number;
  profitPerTrade: number;
}[] {
  // Implementation remains the same, just adding return type
  return this.generateProfitabilityHeatmap(tradingState);
}
