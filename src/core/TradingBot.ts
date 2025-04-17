import { 
  TradingBotConfig, 
  ExchangeConfig, 
  TradingState,
  GridLevel,
  PerformanceMetrics,
  HistoricalTrade,
  GridOrder,
  PositionManagementConfig,
  GridAdjustmentTrigger
} from '../types';
import { GridGenerator } from './GridGenerator';
import { OrderAllocator } from './OrderAllocator';
import { RiskManager } from '../risk-management/RiskManager';
import { ExecutionEngine } from '../execution/ExecutionEngine';
import { ExchangeConnector } from '../api/ExchangeConnector';
import logger from '../utils/logger';
import { validateConfig } from '../config/defaultConfig';

/**
 * Main TradingBot class that orchestrates the entire trading system
 */
export class TradingBot {
  private config: TradingBotConfig;
  private exchangeConfig: ExchangeConfig;
  private gridGenerator: GridGenerator;
  private orderAllocator: OrderAllocator;
  private riskManager: RiskManager;
  private executionEngine: ExecutionEngine;
  private exchangeConnector: ExchangeConnector;
  
  private tradingState: TradingState;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastAdjustmentTime: number = 0;
  private priceHistory: number[] = [];

  constructor(config: TradingBotConfig, exchangeConfig: ExchangeConfig) {
    // Validate the configuration
    validateConfig(config);
    
    this.config = config;
    this.exchangeConfig = exchangeConfig;
    
    // Initialize the exchange connector
    this.exchangeConnector = new ExchangeConnector(exchangeConfig);
    
    // Initialize trading state
    this.tradingState = {
      currentPrice: 0,
      gridLevels: [],
      activeOrders: [],
      filledOrders: [],
      unrealizedPnL: 0,
      realizedPnL: 0,
      currentStopLossLevel: 0
    };
    
    logger.info('Trading bot created with configuration', { 
      assetPair: config.investment.assetPair,
      grids: config.grid.numberOfGrids, 
      distribution: config.grid.distributionMethod
    });
  }

  /**
   * Initialize the trading bot with market data and components
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing trading bot...');
      
      // Get current market price
      const currentPrice = await this.exchangeConnector.getCurrentPrice();
      this.tradingState.currentPrice = currentPrice;
      this.priceHistory.push(currentPrice);
      
      // Get historical volatility
      const historicalVolatility = await this.exchangeConnector.calculateHistoricalVolatility();
      
      // Initialize grid generator
      this.gridGenerator = new GridGenerator(
        this.config.grid,
        currentPrice,
        historicalVolatility
      );
      
      // Generate grid levels
      const gridLevels = this.gridGenerator.generateGridLevels();
      this.tradingState.gridLevels = gridLevels;
      
      // Initialize order allocator
      this.orderAllocator = new OrderAllocator(
        this.config.order,
        this.config.investment
      );
      
      // Generate orders for grid levels
      const gridLevelsWithOrders = this.orderAllocator.generateGridOrders(
        gridLevels,
        currentPrice
      );
      this.tradingState.gridLevels = gridLevelsWithOrders;
      
      // Initialize risk manager
      this.riskManager = new RiskManager(
        this.config.riskManagement,
        currentPrice
      );
      
      // Initialize execution engine with initial state
      this.executionEngine = new ExecutionEngine(
        this.exchangeConfig,
        this.tradingState
      );
      
      // Initialize execution engine (place initial orders)
      await this.executionEngine.initialize();
      
      // Get updated trading state after initialization
      this.tradingState = this.executionEngine.getTradingState();
      
      logger.info('Trading bot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize trading bot', error);
      throw error;
    }
  }

  /**
   * Start the trading bot
   * @param intervalMs Interval in milliseconds between trading cycles
   */
  public start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      logger.warn('Trading bot is already running');
      return;
    }
    
    logger.info(`Starting trading bot with interval of ${intervalMs}ms`);
    
    this.isRunning = true;
    this.lastAdjustmentTime = Date.now();
    
    // Start trading loop
    this.intervalId = setInterval(async () => {
      try {
        await this.tradingCycle();
      } catch (error) {
        logger.error('Error in trading cycle', error);
      }
    }, intervalMs);
  }

  /**
   * Stop the trading bot
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Trading bot is not running');
      return;
    }
    
    logger.info('Stopping trading bot');
    
    // Clear interval
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Cancel all active orders
    try {
      await this.executionEngine.cancelAllOrders();
      logger.info('All orders canceled');
    } catch (error) {
      logger.error('Failed to cancel orders', error);
    }
    
    this.isRunning = false;
    logger.info('Trading bot stopped');
  }

  /**
   * Execute a single trading cycle
   */
  private async tradingCycle(): Promise<void> {
    if (!this.isRunning) return;
    
    logger.info('Starting trading cycle');
    
    try {
      // Update market data and check for order fills
      await this.executionEngine.updateMarketData();
      
      // Get updated trading state
      this.tradingState = this.executionEngine.getTradingState();
      this.priceHistory.push(this.tradingState.currentPrice);
      
      // Check if stop loss is triggered
      const isStopLossTriggered = this.riskManager.isStopLossTriggered(
        this.tradingState.currentPrice
      );
      
      if (isStopLossTriggered) {
        logger.warn('Stop loss triggered');
        await this.handleStopLossEvent();
      }
      
      // Update stop loss levels
      this.tradingState.currentStopLossLevel = this.riskManager.updateStopLoss(this.tradingState) || 0;
      
      // Check for potential market reversals
      const isReversalDetected = this.riskManager.detectReversal(this.priceHistory);
      
      if (isReversalDetected) {
        logger.info('Market reversal detected');
        await this.handleMarketReversal();
      }
      
      // Check if grid adjustment is needed
      await this.checkGridAdjustment();
      
      logger.info('Trading cycle completed');
    } catch (error) {
      logger.error('Error in trading cycle', error);
    }
  }

  /**
   * Handle stop loss event
   */
  private async handleStopLossEvent(): Promise<void> {
    try {
      // Execute stop loss
      const { updatedGridLevels, closedOrders } = this.riskManager.executeStopLoss(
        this.tradingState
      );
      
      // Update trading state
      this.tradingState.gridLevels = updatedGridLevels;
      
      // Remove closed orders from active orders
      this.tradingState.activeOrders = this.tradingState.activeOrders.filter(
        order => !closedOrders.some(closedOrder => closedOrder.id === order.id)
      );
      
      // Cancel orders on the exchange
      for (const order of closedOrders) {
        if (order.exchangeOrderId) {
          await this.exchangeConnector.cancelOrder(order.exchangeOrderId);
        }
      }
      
      logger.warn(`Stop loss executed: ${closedOrders.length} orders closed`);
    } catch (error) {
      logger.error('Failed to handle stop loss event', error);
    }
  }

  /**
   * Handle market reversal event
   */
  private async handleMarketReversal(): Promise<void> {
    try {
      // Cancel all active orders
      await this.executionEngine.cancelAllOrders();
      
      // Update grid levels for the new market direction
      const currentPrice = this.tradingState.currentPrice;
      
      // Generate new grid levels around the new price
      this.gridGenerator = new GridGenerator(
        this.config.grid,
        currentPrice,
        await this.exchangeConnector.calculateHistoricalVolatility()
      );
      
      const newGridLevels = this.gridGenerator.generateGridLevels();
      
      // Generate new orders for the grid levels
      const gridLevelsWithOrders = this.orderAllocator.generateGridOrders(
        newGridLevels,
        currentPrice
      );
      
      // Update trading state
      this.tradingState.gridLevels = gridLevelsWithOrders;
      this.tradingState.activeOrders = [];
      
      // Initialize execution engine with new grid levels
      this.executionEngine = new ExecutionEngine(
        this.exchangeConfig,
        this.tradingState
      );
      
      await this.executionEngine.initialize();
      
      // Get updated trading state
      this.tradingState = this.executionEngine.getTradingState();
      
      logger.info('Market reversal handled: grid levels adjusted');
    } catch (error) {
      logger.error('Failed to handle market reversal', error);
    }
  }

  /**
   * Check if grid adjustment is needed based on position management configuration
   */
  private async checkGridAdjustment(): Promise<void> {
    const positionConfig = this.config.positionManagement;
    
    if (!positionConfig.gridAdjustment.enabled) {
      return;
    }
    
    const currentTime = Date.now();
    const trigger = positionConfig.gridAdjustment.trigger;
    
    let shouldAdjust = false;
    
    switch (trigger) {
      case GridAdjustmentTrigger.TIME_BASED:
        // Check if enough time has passed since last adjustment
        const timeInterval = positionConfig.gridAdjustment.timeInterval || 3600000; // Default 1 hour
        shouldAdjust = (currentTime - this.lastAdjustmentTime) >= timeInterval;
        break;
        
      case GridAdjustmentTrigger.VOLATILITY_BASED:
        // Check if market volatility exceeds threshold
        const volatilityThreshold = positionConfig.gridAdjustment.volatilityThreshold || 5;
        const recentPrices = this.priceHistory.slice(-10);
        
        if (recentPrices.length >= 2) {
          const maxPrice = Math.max(...recentPrices);
          const minPrice = Math.min(...recentPrices);
          const volatilityPercent = ((maxPrice - minPrice) / minPrice) * 100;
          
          shouldAdjust = volatilityPercent >= volatilityThreshold;
          
          if (shouldAdjust) {
            logger.info(`Volatility-based grid adjustment triggered: ${volatilityPercent.toFixed(2)}% volatility detected`);
          }
        }
        break;
        
      case GridAdjustmentTrigger.PROFIT_THRESHOLD:
        // Check if profit exceeds threshold
        const profitThreshold = positionConfig.gridAdjustment.profitThreshold || 2;
        const totalProfit = this.tradingState.realizedPnL + this.tradingState.unrealizedPnL;
        const investmentAmount = this.config.investment.totalInvestment;
        const profitPercent = (totalProfit / investmentAmount) * 100;
        
        shouldAdjust = profitPercent >= profitThreshold;
        
        if (shouldAdjust) {
          logger.info(`Profit-based grid adjustment triggered: ${profitPercent.toFixed(2)}% profit reached`);
        }
        break;
    }
    
    if (shouldAdjust) {
      await this.adjustGridLevels();
      this.lastAdjustmentTime = currentTime;
    }
  }

  /**
   * Adjust grid levels based on current market conditions
   */
  private async adjustGridLevels(): Promise<void> {
    try {
      logger.info('Adjusting grid levels based on current market conditions');
      
      // Cancel all active orders
      await this.executionEngine.cancelAllOrders();
      
      const currentPrice = this.tradingState.currentPrice;
      
      // Create new grid levels centered around current price
      this.gridGenerator = new GridGenerator(
        this.config.grid,
        currentPrice,
        await this.exchangeConnector.calculateHistoricalVolatility()
      );
      
      const newGridLevels = this.gridGenerator.generateGridLevels();
      
      // Generate new orders for the grid levels
      const gridLevelsWithOrders = this.orderAllocator.generateGridOrders(
        newGridLevels,
        currentPrice
      );
      
      // Update trading state
      this.tradingState.gridLevels = gridLevelsWithOrders;
      this.tradingState.activeOrders = [];
      
      // Initialize execution engine with new grid levels
      this.executionEngine = new ExecutionEngine(
        this.exchangeConfig,
        this.tradingState
      );
      
      await this.executionEngine.initialize();
      
      // Get updated trading state
      this.tradingState = this.executionEngine.getTradingState();
      
      logger.info('Grid levels adjusted successfully');
    } catch (error) {
      logger.error('Failed to adjust grid levels', error);
    }
  }

  /**
   * Check if drift correction is needed and apply if necessary
   */
  private async checkDriftCorrection(): Promise<void> {
    if (!this.config.positionManagement.driftCorrectionEnabled) {
      return;
    }
    
    try {
      // Get current positions
      const balance = await this.exchangeConnector.getAccountBalance();
      
      // Calculate expected position based on trading state
      const assetPair = this.config.investment.assetPair;
      const [baseCurrency, quoteCurrency] = assetPair.split('/');
      
      // Calculate expected base currency amount
      const expectedBaseAmount = this.tradingState.activeOrders
        .filter(order => order.side === 'buy')
        .reduce((sum, order) => sum + order.size, 0);
      
      // Calculate drift amount
      const driftAmount = balance.base - expectedBaseAmount;
      const driftThreshold = 0.05; // 5% drift threshold
      
      if (Math.abs(driftAmount) / expectedBaseAmount > driftThreshold) {
        logger.warn(`Position drift detected: ${driftAmount.toFixed(8)} ${baseCurrency}`);
        
        // Implement drift correction
        await this.correctPositionDrift(driftAmount, baseCurrency);
      }
    } catch (error) {
      logger.error('Failed to check drift correction', error);
    }
  }

  /**
   * Correct position drift by placing corrective orders
   */
  private async correctPositionDrift(driftAmount: number, baseCurrency: string): Promise<void> {
    try {
      const currentPrice = this.tradingState.currentPrice;
      
      if (driftAmount > 0) {
        // We have excess base currency, need to sell
        logger.info(`Correcting drift by selling ${driftAmount.toFixed(8)} ${baseCurrency}`);
        
        await this.exchangeConnector.placeOrder({
          price: currentPrice * 0.999, // Slightly below market price for quick execution
          size: driftAmount,
          side: 'sell',
          type: 'limit'
        });
      } else {
        // We have deficit base currency, need to buy
        const amountToBuy = Math.abs(driftAmount);
        logger.info(`Correcting drift by buying ${amountToBuy.toFixed(8)} ${baseCurrency}`);
        
        await this.exchangeConnector.placeOrder({
          price: currentPrice * 1.001, // Slightly above market price for quick execution
          size: amountToBuy,
          side: 'buy',
          type: 'limit'
        });
      }
      
      logger.info('Position drift correction order placed');
    } catch (error) {
      logger.error('Failed to correct position drift', error);
    }
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return this.executionEngine.getPerformanceMetrics();
  }

  /**
   * Get historical trades
   */
  public getHistoricalTrades(): HistoricalTrade[] {
    return this.executionEngine.getHistoricalTrades();
  }

  /**
   * Get current trading state
   */
  public getTradingState(): TradingState {
    return this.tradingState;
  }

  /**
   * Check if the trading bot is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }
}


/**
 * Get current performance metrics with proper return type
 */
public getPerformanceMetrics(): PerformanceMetrics {
  return this.executionEngine.getPerformanceMetrics();
}

/**
 * Get historical trades with proper return type
 */
public getHistoricalTrades(): HistoricalTrade[] {
  return this.executionEngine.getHistoricalTrades();
}

/**
 * Get current trading state with proper return type
 */
public getTradingState(): TradingState {
  return { ...this.tradingState };
}

/**
 * Check if the trading bot is running with proper return type
 */
public isActive(): boolean {
  return this.isRunning;
}

/**
 * Type guard for checking if trading state exists and is valid
 */
private isTradingStateValid(state: any): state is TradingState {
  return (
    state !== null &&
    typeof state === 'object' &&
    'gridLevels' in state &&
    'currentPrice' in state &&
    'activeOrders' in state &&
    'filledOrders' in state
  );
}
