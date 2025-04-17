import { 
  OrderConfig, 
  OrderAllocationMethod, 
  GridLevel,
  OrderType,
  InvestmentConfig,
  GridOrder 
} from '../types';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Order Allocator class responsible for calculating order sizes and allocating capital across grid levels
 */
export class OrderAllocator {
  private orderConfig: OrderConfig;
  private investmentConfig: InvestmentConfig;

  constructor(orderConfig: OrderConfig, investmentConfig: InvestmentConfig) {
    this.orderConfig = orderConfig;
    this.investmentConfig = investmentConfig;
  }

  /**
   * Calculate order sizes for each grid level based on the allocation method
   * @param gridLevels Array of grid levels
   * @returns Array of grid levels with order sizes calculated
   */
  public calculateOrderSizes(gridLevels: GridLevel[]): { buyOrderSizes: number[], sellOrderSizes: number[] } {
    switch (this.orderConfig.allocationMethod) {
      case OrderAllocationMethod.EQUAL:
        return this.calculateEqualAllocation(gridLevels);
      case OrderAllocationMethod.WEIGHTED:
        return this.calculateWeightedAllocation(gridLevels);
      case OrderAllocationMethod.CUSTOM:
        return this.calculateCustomAllocation(gridLevels);
      default:
        logger.warn(`Unknown allocation method: ${this.orderConfig.allocationMethod}, falling back to equal allocation`);
        return this.calculateEqualAllocation(gridLevels);
    }
  }

  /**
   * Calculate equal order sizes across all grid levels
   */
  private calculateEqualAllocation(gridLevels: GridLevel[]): { buyOrderSizes: number[], sellOrderSizes: number[] } {
    const totalInvestment = this.investmentConfig.totalInvestment;
    const leverage = this.investmentConfig.leverage;
    const adjustedInvestment = totalInvestment * leverage;
    
    // Divide the investment equally among each grid level
    const investmentPerLevel = adjustedInvestment / gridLevels.length;
    
    // Calculate how much of the base asset to buy/sell at each level
    const buyOrderSizes: number[] = [];
    const sellOrderSizes: number[] = [];
    
    gridLevels.forEach(level => {
      // For buy orders, we divide by price to get the amount of base asset
      const buySize = investmentPerLevel / level.price;
      buyOrderSizes.push(buySize);
      
      // For sell orders, we calculate the same amount of base asset
      sellOrderSizes.push(buySize);
    });
    
    logger.info(`Calculated equal allocation: ${investmentPerLevel} per level`);
    return { buyOrderSizes, sellOrderSizes };
  }

  /**
   * Calculate weighted order sizes with more capital in central grid levels
   */
  private calculateWeightedAllocation(gridLevels: GridLevel[]): { buyOrderSizes: number[], sellOrderSizes: number[] } {
    const totalInvestment = this.investmentConfig.totalInvestment;
    const leverage = this.investmentConfig.leverage;
    const adjustedInvestment = totalInvestment * leverage;
    
    // Calculate weights for each level
    // Central levels get higher weights than edge levels
    const weights: number[] = [];
    const n = gridLevels.length;
    
    for (let i = 0; i < n; i++) {
      // Calculate distance from center (normalized to 0-1)
      const distFromCenter = Math.abs((i / (n - 1)) - 0.5) * 2;
      
      // Apply a triangular weighting function
      // Weight is higher for central levels, lower for edge levels
      weights.push(1 - distFromCenter);
    }
    
    // Normalize weights so they sum to 1
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    const normalizedWeights = weights.map(w => w / weightSum);
    
    // Calculate order sizes based on weights
    const buyOrderSizes: number[] = [];
    const sellOrderSizes: number[] = [];
    
    gridLevels.forEach((level, i) => {
      const investmentForLevel = adjustedInvestment * normalizedWeights[i];
      const orderSize = investmentForLevel / level.price;
      
      buyOrderSizes.push(orderSize);
      sellOrderSizes.push(orderSize);
    });
    
    logger.info('Calculated weighted allocation with more capital in central grid levels');
    return { buyOrderSizes, sellOrderSizes };
  }

  /**
   * Calculate custom order sizes based on the user-provided pattern
   */
  private calculateCustomAllocation(gridLevels: GridLevel[]): { buyOrderSizes: number[], sellOrderSizes: number[] } {
    const totalInvestment = this.investmentConfig.totalInvestment;
    const leverage = this.investmentConfig.leverage;
    const adjustedInvestment = totalInvestment * leverage;
    
    // Use custom allocation pattern
    if (!this.orderConfig.customAllocationPattern || this.orderConfig.customAllocationPattern.length !== gridLevels.length) {
      logger.error('Custom allocation pattern is missing or has incorrect length, falling back to equal allocation');
      return this.calculateEqualAllocation(gridLevels);
    }
    
    // Normalize the custom allocation pattern to sum to 1
    const patternSum = this.orderConfig.customAllocationPattern.reduce((sum, val) => sum + val, 0);
    const normalizedPattern = this.orderConfig.customAllocationPattern.map(val => val / patternSum);
    
    // Calculate order sizes based on custom pattern
    const buyOrderSizes: number[] = [];
    const sellOrderSizes: number[] = [];
    
    gridLevels.forEach((level, i) => {
      const investmentForLevel = adjustedInvestment * normalizedPattern[i];
      const orderSize = investmentForLevel / level.price;
      
      buyOrderSizes.push(orderSize);
      sellOrderSizes.push(orderSize);
    });
    
    logger.info('Calculated custom allocation based on user-defined pattern');
    return { buyOrderSizes, sellOrderSizes };
  }

  /**
   * Generate grid orders for each grid level
   * @param gridLevels Array of grid levels
   * @param currentPrice Current market price
   * @returns Array of grid levels with orders
   */
  public generateGridOrders(gridLevels: GridLevel[], currentPrice: number): GridLevel[] {
    const { buyOrderSizes, sellOrderSizes } = this.calculateOrderSizes(gridLevels);
    
    // Generate orders for each grid level
    const updatedGridLevels = gridLevels.map((level, index) => {
      // Clone the level to avoid mutations
      const updatedLevel: GridLevel = { ...level };
      
      // Only create orders for active grid levels
      if (!updatedLevel.isActive) {
        return updatedLevel;
      }
      
      // Create buy order for grid levels below the current price
      if (level.price < currentPrice) {
        updatedLevel.buyOrder = {
          id: uuidv4(),
          price: level.price,
          size: buyOrderSizes[index],
          type: this.orderConfig.orderType,
          side: 'buy',
          status: 'pending'
        };
      }
      
      // Create sell order for grid levels above the current price
      if (level.price > currentPrice) {
        updatedLevel.sellOrder = {
          id: uuidv4(),
          price: level.price,
          size: sellOrderSizes[index],
          type: this.orderConfig.orderType,
          side: 'sell',
          status: 'pending'
        };
      }
      
      return updatedLevel;
    });
    
    logger.info(`Generated orders for ${updatedGridLevels.length} grid levels`);
    return updatedGridLevels;
  }

  /**
   * Generate the opposite order after an order is filled
   * @param filledOrder The filled order
   * @param gridLevel The grid level where the order was filled
   * @returns The newly created opposite order
   */
  public generateOppositeOrder(filledOrder: GridOrder, gridLevel: GridLevel): GridOrder {
    const oppositeSide = filledOrder.side === 'buy' ? 'sell' : 'buy';
    
    const newOrder: GridOrder = {
      id: uuidv4(),
      price: gridLevel.price,
      size: filledOrder.size,
      type: this.orderConfig.orderType,
      side: oppositeSide,
      status: 'pending'
    };
    
    logger.info(`Generated ${oppositeSide} order at price ${gridLevel.price} to replace filled ${filledOrder.side} order`);
    return newOrder;
  }
}
