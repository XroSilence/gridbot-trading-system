import { 
  TradingState, 
  GridOrder,
  GridLevel,
  OrderType,
  ExchangeConfig,
  PerformanceMetrics,
  HistoricalTrade
} from '../types';
import logger from '../utils/logger';
import { ExchangeConnector } from '../api/ExchangeConnector';

/**
 * Execution Engine responsible for order placement, monitoring, and execution
 */
export class ExecutionEngine {
  private exchangeConnector: ExchangeConnector;
  private tradingState: TradingState;
  private historicalTrades: HistoricalTrade[] = [];
  private priceHistory: number[] = [];
  private latestPerformanceMetrics: PerformanceMetrics;

  constructor(exchangeConfig: ExchangeConfig, initialState: TradingState) {
    this.exchangeConnector = new ExchangeConnector(exchangeConfig);
    this.tradingState = { ...initialState };
    
    // Initialize performance metrics
    this.latestPerformanceMetrics = {
      unrealizedPnL: 0,
      realizedPnL: 0,
      gridUtilizationPercentage: 0,
      riskExposure: 0,
      currentStopLossLevel: 0,
      tradeCount: 0,
      successRate: 0
    };
  }

  /**
   * Initialize the execution engine by placing initial orders
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing execution engine');
      
      // Get current market price
      const currentPrice = await this.exchangeConnector.getCurrentPrice();
      this.tradingState.currentPrice = currentPrice;
      this.priceHistory.push(currentPrice);
      
      // Place initial orders
      await this.placeGridOrders();
      
      // Calculate initial performance metrics
      this.updatePerformanceMetrics();
      
      logger.info('Execution engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize execution engine', error);
      throw error;
    }
  }

  /**
   * Place orders for all active grid levels
   */
  private async placeGridOrders(): Promise<void> {
    const placedOrders: GridOrder[] = [];
    
    for (const level of this.tradingState.gridLevels) {
      if (!level.isActive) continue;
      
      try {
        // Place buy order if it exists
        if (level.buyOrder && level.buyOrder.status === 'pending') {
          const placedBuyOrder = await this.placeOrder(level.buyOrder);
          placedOrders.push(placedBuyOrder);
        }
        
        // Place sell order if it exists
        if (level.sellOrder && level.sellOrder.status === 'pending') {
          const placedSellOrder = await this.placeOrder(level.sellOrder);
          placedOrders.push(placedSellOrder);
        }
      } catch (error) {
        logger.error(`Failed to place orders for grid level ${level.price}`, error);
      }
    }
    
    // Update the trading state with placed orders
    this.tradingState.activeOrders = [
      ...this.tradingState.activeOrders.filter(order => 
        !placedOrders.some(placedOrder => placedOrder.id === order.id)
      ),
      ...placedOrders
    ];
    
    logger.info(`Placed ${placedOrders.length} grid orders`);
  }

  /**
   * Place a single order on the exchange
   */
  private async placeOrder(order: GridOrder): Promise<GridOrder> {
    try {
      // Place the order on the exchange
      const exchangeOrderId = await this.exchangeConnector.placeOrder({
        price: order.price,
        size: order.size,
        side: order.side,
        type: order.type
      });
      
      // Update the order with exchange order ID
      const updatedOrder: GridOrder = {
        ...order,
        exchangeOrderId,
        status: 'pending'
      };
      
      logger.info(`Placed ${order.side} order of ${order.size} at price ${order.price}`);
      return updatedOrder;
    } catch (error) {
      logger.error(`Failed to place ${order.side} order at price ${order.price}`, error);
      throw error;
    }
  }

  /**
   * Update the current market price and check for order fills
   */
  public async updateMarketData(): Promise<void> {
    try {
      // Get current market price
      const currentPrice = await this.exchangeConnector.getCurrentPrice();
      this.tradingState.currentPrice = currentPrice;
      this.priceHistory.push(currentPrice);
      
      // Check for filled orders
      const filledOrders = await this.checkOrderFills();
      
      // Process filled orders
      if (filledOrders.length > 0) {
        await this.processFilledOrders(filledOrders);
      }
      
      // Update performance metrics
      this.updatePerformanceMetrics();
      
      logger.info(`Updated market data: current price ${currentPrice}, ${filledOrders.length} orders filled`);
    } catch (error) {
      logger.error('Failed to update market data', error);
    }
  }

  /**
   * Check for order fills on the exchange
   */
  private async checkOrderFills(): Promise<GridOrder[]> {
    const filledOrders: GridOrder[] = [];
    
    for (const order of this.tradingState.activeOrders) {
      if (!order.exchangeOrderId) continue;
      
      try {
        const orderStatus = await this.exchangeConnector.getOrderStatus(order.exchangeOrderId);
        
        if (orderStatus === 'filled') {
          // Update the order status
          const filledOrder: GridOrder = {
            ...order,
            status: 'filled'
          };
          
          filledOrders.push(filledOrder);
          logger.info(`Order filled: ${order.side} ${order.size} at price ${order.price}`);
        }
      } catch (error) {
        logger.error(`Failed to check status for order ${order.id}`, error);
      }
    }
    
    return filledOrders;
  }

  /**
   * Process filled orders and place opposite orders
   */
  private async processFilledOrders(filledOrders: GridOrder[]): Promise<void> {
    // Remove filled orders from active orders
    this.tradingState.activeOrders = this.tradingState.activeOrders.filter(
      order => !filledOrders.some(filledOrder => filledOrder.id === order.id)
    );
    
    // Add filled orders to filled orders list
    this.tradingState.filledOrders = [
      ...this.tradingState.filledOrders,
      ...filledOrders
    ];
    
    // Calculate realized P&L from filled orders
    this.calculateRealizedPnL(filledOrders);
    
    // Update grid levels and place opposite orders
    const newOrders: GridOrder[] = [];
    
    for (const filledOrder of filledOrders) {
      // Find the grid level for this order
      const gridLevelIndex = this.tradingState.gridLevels.findIndex(level => 
        (level.buyOrder?.id === filledOrder.id) || (level.sellOrder?.id === filledOrder.id)
      );
      
      if (gridLevelIndex === -1) continue;
      
      const gridLevel = this.tradingState.gridLevels[gridLevelIndex];
      
      // Place opposite order
      try {
        const oppositeSide = filledOrder.side === 'buy' ? 'sell' : 'buy';
        
        // Create new order
        const newOrder: GridOrder = {
          id: `${filledOrder.id}-opposite`,
          price: gridLevel.price,
          size: filledOrder.size,
          type: filledOrder.type,
          side: oppositeSide,
          status: 'pending'
        };
        
        // Place the order
        const placedOrder = await this.placeOrder(newOrder);
        newOrders.push(placedOrder);
        
        // Update grid level
        const updatedGridLevel = { ...gridLevel };
        
        if (oppositeSide === 'buy') {
          updatedGridLevel.buyOrder = placedOrder;
          updatedGridLevel.sellOrder = undefined;
        } else {
          updatedGridLevel.sellOrder = placedOrder;
          updatedGridLevel.buyOrder = undefined;
        }
        
        this.tradingState.gridLevels[gridLevelIndex] = updatedGridLevel;
        
        // Record historical trade
        this.recordTrade(filledOrder, gridLevelIndex);
      } catch (error) {
        logger.error(`Failed to place opposite order for filled order ${filledOrder.id}`, error);
      }
    }
    
    // Add new orders to active orders
    this.tradingState.activeOrders = [
      ...this.tradingState.activeOrders,
      ...newOrders
    ];
    
    logger.info(`Processed ${filledOrders.length} filled orders, placed ${newOrders.length} new orders`);
  }

  /**
   * Calculate realized P&L from filled orders
   */
  private calculateRealizedPnL(filledOrders: GridOrder[]): void {
    let newRealizedPnL = 0;
    
    for (const filledOrder of filledOrders) {
      // For buy orders, we're buying at a lower price than we'll sell
      // For sell orders, we're selling at a higher price than we bought
      const previousOppositeOrders = this.tradingState.filledOrders.filter(order => 
        order.price === filledOrder.price && order.side !== filledOrder.side
      );
      
      if (previousOppositeOrders.length > 0) {
        // Calculate profit/loss for this grid level
        const oppositeOrder = previousOppositeOrders[previousOppositeOrders.length - 1];
        
        if (filledOrder.side === 'sell' && oppositeOrder.side === 'buy') {
          // Selling higher than we bought
          const profit = (filledOrder.price - oppositeOrder.price) * filledOrder.size;
          newRealizedPnL += profit;
          
          logger.info(`Realized profit: ${profit} from buy at ${oppositeOrder.price} and sell at ${filledOrder.price}`);
        } else if (filledOrder.side === 'buy' && oppositeOrder.side === 'sell') {
          // Buying lower than we sold
          const profit = (oppositeOrder.price - filledOrder.price) * filledOrder.size;
          newRealizedPnL += profit;
          
          logger.info(`Realized profit: ${profit} from sell at ${oppositeOrder.price} and buy at ${filledOrder.price}`);
        }
      }
    }
    
    // Update total realized P&L
    this.tradingState.realizedPnL += newRealizedPnL;
  }

  /**
   * Record a trade in the historical trades list
   */
  private recordTrade(order: GridOrder, gridLevelIndex: number): void {
    const oppositeOrders = this.tradingState.filledOrders.filter(o => 
      o.price === order.price && o.side !== order.side
    );
    
    let profit = 0;
    
    if (oppositeOrders.length > 0) {
      const oppositeOrder = oppositeOrders[oppositeOrders.length - 1];
      
      if (order.side === 'sell') {
        profit = (order.price - oppositeOrder.price) * order.size;
      } else {
        profit = (oppositeOrder.price - order.price) * order.size;
      }
    }
    
    const trade: HistoricalTrade = {
      timestamp: Date.now(),
      price: order.price,
      size: order.size,
      side: order.side,
      gridLevel: gridLevelIndex,
      profit
    };
    
    this.historicalTrades.push(trade);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    // Calculate unrealized P&L
    this.calculateUnrealizedPnL();
    
    // Calculate grid utilization percentage
    const activeGrids = this.tradingState.gridLevels.filter(level => level.isActive).length;
    const totalGrids = this.tradingState.gridLevels.length;
    const gridUtilization = (activeGrids / totalGrids) * 100;
    
    // Calculate risk exposure
    const totalInvested = this.tradingState.activeOrders.reduce((sum, order) => {
      return sum + (order.price * order.size);
    }, 0);
    
    // Calculate success rate
    const totalTrades = this.historicalTrades.length;
    const profitableTrades = this.historicalTrades.filter(trade => trade.profit > 0).length;
    const successRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    
    // Update performance metrics
    this.latestPerformanceMetrics = {
      unrealizedPnL: this.tradingState.unrealizedPnL,
      realizedPnL: this.tradingState.realizedPnL,
      gridUtilizationPercentage: gridUtilization,
      riskExposure: totalInvested,
      currentStopLossLevel: this.tradingState.currentStopLossLevel,
      tradeCount: totalTrades,
      successRate
    };
  }

  /**
   * Calculate unrealized P&L
   */
  private calculateUnrealizedPnL(): void {
    const currentPrice = this.tradingState.currentPrice;
    let unrealizedPnL = 0;
    
    // Calculate potential profit/loss from active orders
    for (const order of this.tradingState.activeOrders) {
      if (order.status !== 'pending') continue;
      
      if (order.side === 'buy') {
        // For buy orders, we're profitable if current price is higher
        const potentialProfit = (currentPrice - order.price) * order.size;
        unrealizedPnL += potentialProfit;
      } else {
        // For sell orders, we're profitable if current price is lower
        const potentialProfit = (order.price - currentPrice) * order.size;
        unrealizedPnL += potentialProfit;
      }
    }
    
    this.tradingState.unrealizedPnL = unrealizedPnL;
  }

  /**
   * Get the current trading state
   */
  public getTradingState(): TradingState {
    return { ...this.tradingState };
  }

  /**
   * Get the latest performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.latestPerformanceMetrics };
  }

  /**
   * Get historical trades
   */
  public getHistoricalTrades(): HistoricalTrade[] {
    return [...this.historicalTrades];
  }

  /**
   * Get price history
   */
  public getPriceHistory(): number[] {
    return [...this.priceHistory];
  }

  /**
   * Cancel all active orders
   */
  public async cancelAllOrders(): Promise<void> {
    try {
      for (const order of this.tradingState.activeOrders) {
        if (order.exchangeOrderId) {
          await this.exchangeConnector.cancelOrder(order.exchangeOrderId);
          logger.info(`Canceled order ${order.id}`);
        }
      }
      
      // Clear active orders
      this.tradingState.activeOrders = [];
      
      logger.info('All orders canceled successfully');
    } catch (error) {
      logger.error('Failed to cancel all orders', error);
      throw error;
    }
  }
}
