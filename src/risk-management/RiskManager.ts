import { 
  RiskManagementConfig, 
  StopLossMethod,
  TradingState,
  GridLevel,
  GridOrder
} from '../types';
import logger from '../utils/logger';

/**
 * Risk Manager class responsible for implementing stop loss mechanisms and risk controls
 */
export class RiskManager {
  private config: RiskManagementConfig;
  private initialPrice: number;
  private stopLossPrice: number | null = null;
  private trailingStopPrice: number | null = null;
  private currentProfit: number = 0;

  constructor(config: RiskManagementConfig, initialPrice: number) {
    this.config = config;
    this.initialPrice = initialPrice;
    
    // Initialize stop loss prices if enabled
    if (this.config.basicStopLoss.enabled) {
      this.stopLossPrice = this.calculateBasicStopLossPrice(initialPrice);
    }
  }

  /**
   * Calculate the basic stop loss price based on the current price
   */
  private calculateBasicStopLossPrice(currentPrice: number): number {
    // Calculate stop loss price (always below current price for long positions)
    return currentPrice * (1 - this.config.basicStopLoss.percentage / 100);
  }

  /**
   * Calculate the dynamic stop loss price based on current profit
   */
  private calculateDynamicStopLossPrice(currentPrice: number, currentProfit: number): number {
    if (!this.config.dynamicStopLoss.enabled) {
      return this.calculateBasicStopLossPrice(currentPrice);
    }

    // Calculate dynamic stop loss
    const initialThreshold = this.config.dynamicStopLoss.initialRiskThreshold;
    const expansionFactor = this.config.dynamicStopLoss.expansionFactor;
    const maxExpansion = this.config.dynamicStopLoss.maximumExpansion;
    
    // Expansion based on profit
    const profitExpansion = Math.min(
      currentProfit * expansionFactor,
      maxExpansion
    );
    
    // Final dynamic stop loss percentage
    const dynamicStopLossPercentage = initialThreshold + profitExpansion;
    
    // Calculate stop loss price
    return currentPrice * (1 - dynamicStopLossPercentage / 100);
  }

  /**
   * Update stop loss levels based on current market conditions and trading state
   * @param tradingState Current trading state
   * @returns Updated stop loss price
   */
  public updateStopLoss(tradingState: TradingState): number | null {
    const currentPrice = tradingState.currentPrice;
    this.currentProfit = tradingState.unrealizedPnL + tradingState.realizedPnL;
    
    // Basic stop loss
    if (this.config.basicStopLoss.enabled) {
      this.stopLossPrice = this.calculateBasicStopLossPrice(currentPrice);
    }
    
    // Dynamic stop loss
    if (this.config.dynamicStopLoss.enabled) {
      this.stopLossPrice = this.calculateDynamicStopLossPrice(currentPrice, this.currentProfit);
    }
    
    // Trailing stop loss
    if (this.config.trailingStopLoss.enabled) {
      this.updateTrailingStopLoss(currentPrice);
    }
    
    logger.info(`Updated stop loss price: ${this.stopLossPrice}`);
    return this.stopLossPrice;
  }

  /**
   * Update the trailing stop loss based on price movements
   */
  private updateTrailingStopLoss(currentPrice: number): void {
    const activationThreshold = this.config.trailingStopLoss.activationThreshold;
    const trailingDistance = this.config.trailingStopLoss.trailingDistance;
    
    // Check if profit exceeds activation threshold
    const profitPercentage = ((currentPrice / this.initialPrice) - 1) * 100;
    
    if (profitPercentage >= activationThreshold) {
      // Calculate new trailing stop price
      const newTrailingStop = currentPrice * (1 - trailingDistance / 100);
      
      // Update trailing stop if it's null or the new stop is higher
      if (this.trailingStopPrice === null || newTrailingStop > this.trailingStopPrice) {
        this.trailingStopPrice = newTrailingStop;
        logger.info(`Updated trailing stop price to ${this.trailingStopPrice}`);
      }
    }
    
    // If trailing stop is active, use it instead of regular stop loss
    if (this.trailingStopPrice !== null && 
        (this.stopLossPrice === null || this.trailingStopPrice > this.stopLossPrice)) {
      this.stopLossPrice = this.trailingStopPrice;
    }
  }

  /**
   * Check if the stop loss has been triggered
   * @param currentPrice Current market price
   * @returns Boolean indicating if stop loss is triggered
   */
  public isStopLossTriggered(currentPrice: number): boolean {
    if (this.stopLossPrice === null) {
      return false;
    }
    
    return currentPrice <= this.stopLossPrice;
  }

  /**
   * Execute stop loss - close positions based on the configured method
   * @param tradingState Current trading state
   * @returns Updated grid levels and orders after stop loss execution
   */
  public executeStopLoss(tradingState: TradingState): { 
    updatedGridLevels: GridLevel[], 
    closedOrders: GridOrder[] 
  } {
    const method = this.config.basicStopLoss.method;
    const currentPrice = tradingState.currentPrice;
    
    logger.warn(`Executing ${method} stop loss at price ${currentPrice}`);
    
    if (method === StopLossMethod.HARD) {
      // Hard stop: Immediately close all positions
      return this.executeHardStopLoss(tradingState);
    } else {
      // Soft stop: Gradually reduce positions
      return this.executeSoftStopLoss(tradingState);
    }
  }

  /**
   * Execute a hard stop loss by closing all positions
   */
  private executeHardStopLoss(tradingState: TradingState): { 
    updatedGridLevels: GridLevel[], 
    closedOrders: GridOrder[] 
  } {
    // Mark all grid levels as inactive
    const updatedGridLevels = tradingState.gridLevels.map(level => ({
      ...level,
      isActive: false,
      buyOrder: undefined,
      sellOrder: undefined
    }));
    
    // Collect all active orders to close them
    const closedOrders = [...tradingState.activeOrders];
    
    logger.warn(`Hard stop loss executed: closed ${closedOrders.length} orders`);
    
    return {
      updatedGridLevels,
      closedOrders
    };
  }

  /**
   * Execute a soft stop loss by gradually reducing positions
   */
  private executeSoftStopLoss(tradingState: TradingState): { 
    updatedGridLevels: GridLevel[], 
    closedOrders: GridOrder[] 
  } {
    // Sort grid levels by distance from current price
    const currentPrice = tradingState.currentPrice;
    const sortedLevels = [...tradingState.gridLevels].sort((a, b) => {
      const distA = Math.abs(a.price - currentPrice);
      const distB = Math.abs(b.price - currentPrice);
      return distB - distA; // Sort by distance, furthest first
    });
    
    // Close 50% of positions, starting with those furthest from current price
    const closureCount = Math.ceil(sortedLevels.length / 2);
    const levelsToClose = sortedLevels.slice(0, closureCount);
    const levelIdsToClose = new Set(levelsToClose.map(level => level.price));
    
    // Update grid levels
    const updatedGridLevels = tradingState.gridLevels.map(level => {
      if (levelIdsToClose.has(level.price)) {
        return {
          ...level,
          isActive: false,
          buyOrder: undefined,
          sellOrder: undefined
        };
      }
      return level;
    });
    
    // Collect orders to close
    const closedOrders = tradingState.activeOrders.filter(order => {
      const gridLevel = tradingState.gridLevels.find(level => 
        (level.buyOrder?.id === order.id) || (level.sellOrder?.id === order.id)
      );
      return gridLevel && levelIdsToClose.has(gridLevel.price);
    });
    
    logger.warn(`Soft stop loss executed: closed ${closedOrders.length} orders from ${closureCount} grid levels`);
    
    return {
      updatedGridLevels,
      closedOrders
    };
  }

  /**
   * Detect potential market reversals for profit maximization
   * @param priceHistory Array of historical prices
   * @returns Boolean indicating if a reversal is detected
   */
  public detectReversal(priceHistory: number[]): boolean {
    if (priceHistory.length < 10) {
      return false;
    }
    
    // Simple reversal detection algorithm
    // Check if price direction has changed significantly
    
    // Calculate short-term and medium-term trends
    const shortTermSamples = 5;
    const mediumTermSamples = 10;
    
    const shortTermAvg = this.calculateAverage(priceHistory.slice(-shortTermSamples));
    const mediumTermAvg = this.calculateAverage(priceHistory.slice(-mediumTermSamples));
    
    // Short term momentum
    const recentPrices = priceHistory.slice(-3);
    const momentum = recentPrices[recentPrices.length - 1] - recentPrices[0];
    
    // Detect reversal when short-term average crosses medium-term average
    // with significant momentum
    const shortTermHigher = shortTermAvg > mediumTermAvg;
    const significantMomentum = Math.abs(momentum) > (mediumTermAvg * 0.02); // 2% of price
    
    const currentPrice = priceHistory[priceHistory.length - 1];
    const priorPrice = priceHistory[priceHistory.length - 2];
    const priceDirectionChanged = (currentPrice > priorPrice && momentum < 0) || 
                                 (currentPrice < priorPrice && momentum > 0);
    
    const reversalDetected = shortTermHigher && significantMomentum && priceDirectionChanged;
    
    if (reversalDetected) {
      logger.info('Potential market reversal detected');
    }
    
    return reversalDetected;
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((total, value) => total + value, 0);
    return sum / values.length;
  }
}
