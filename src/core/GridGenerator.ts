import { 
  GridConfig, 
  GridDistributionMethod, 
  GridLevel,
  OrderType
} from '../types';
import logger from '../utils/logger';

/**
 * Grid Generator class responsible for creating and managing grid levels
 */
export class GridGenerator {
  private config: GridConfig;
  private currentPrice: number;
  private historicalVolatility?: number;

  constructor(config: GridConfig, currentPrice: number, historicalVolatility?: number) {
    this.config = config;
    this.currentPrice = currentPrice;
    this.historicalVolatility = historicalVolatility;
    
    // Calculate price range if auto-range is enabled
    if (this.config.autoRange) {
      this.calculateAutoRange();
    }
  }

  /**
   * Calculate the auto range based on historical volatility
   */
  private calculateAutoRange(): void {
    if (!this.historicalVolatility) {
      // Default to 10% above and below current price if volatility is not provided
      this.config.upperBound = this.currentPrice * 1.1;
      this.config.lowerBound = this.currentPrice * 0.9;
      logger.warn('Historical volatility not provided, using default range of ±10%');
    } else {
      // Use historical volatility to determine range
      // Typically, range = current price ± (2 * historical volatility)
      this.config.upperBound = this.currentPrice * (1 + 2 * this.historicalVolatility);
      this.config.lowerBound = this.currentPrice * (1 - 2 * this.historicalVolatility);
      logger.info(`Auto range calculated: ${this.config.lowerBound} - ${this.config.upperBound} based on volatility of ${this.historicalVolatility}`);
    }
  }

  /**
   * Generate grid levels based on the configured distribution method
   * @returns Array of grid levels
   */
  public generateGridLevels(): GridLevel[] {
    switch (this.config.distributionMethod) {
      case GridDistributionMethod.LINEAR:
        return this.generateLinearGrid();
      case GridDistributionMethod.ARITHMETIC:
        return this.generateArithmeticGrid();
      case GridDistributionMethod.GEOMETRIC:
        return this.generateGeometricGrid();
      case GridDistributionMethod.VOLATILITY_BASED:
        return this.generateVolatilityBasedGrid();
      default:
        logger.warn(`Unknown distribution method: ${this.config.distributionMethod}, falling back to linear`);
        return this.generateLinearGrid();
    }
  }

  /**
   * Generate a linear grid with equal price distance between levels
   */
  private generateLinearGrid(): GridLevel[] {
    const { numberOfGrids, upperBound, lowerBound } = this.config;
    const gridLevels: GridLevel[] = [];
    
    // Calculate the price step between grid levels
    const step = (upperBound - lowerBound) / (numberOfGrids - 1);
    
    // Generate each grid level
    for (let i = 0; i < numberOfGrids; i++) {
      const price = lowerBound + (step * i);
      
      gridLevels.push({
        price,
        isActive: price !== this.currentPrice
      });
    }
    
    logger.info(`Generated ${gridLevels.length} linear grid levels from ${lowerBound} to ${upperBound}`);
    return gridLevels;
  }

  /**
   * Generate an arithmetic grid with increasing/decreasing price distance between levels
   */
  private generateArithmeticGrid(): GridLevel[] {
    const { numberOfGrids, upperBound, lowerBound } = this.config;
    const gridLevels: GridLevel[] = [];
    
    // Calculate the common difference for the arithmetic progression
    const totalDistance = upperBound - lowerBound;
    const commonDifference = (2 * totalDistance) / (numberOfGrids * (numberOfGrids - 1));
    
    // Generate each grid level
    let currentLevel = lowerBound;
    for (let i = 0; i < numberOfGrids; i++) {
      gridLevels.push({
        price: currentLevel,
        isActive: currentLevel !== this.currentPrice
      });
      
      // Calculate the next step size
      const nextStepSize = commonDifference * (i + 1);
      currentLevel += nextStepSize;
    }
    
    logger.info(`Generated ${gridLevels.length} arithmetic grid levels from ${lowerBound} to approximately ${upperBound}`);
    return gridLevels;
  }

  /**
   * Generate a geometric grid with percentage-based grid spacing
   */
  private generateGeometricGrid(): GridLevel[] {
    const { numberOfGrids, upperBound, lowerBound } = this.config;
    const gridLevels: GridLevel[] = [];
    
    // Calculate the common ratio for the geometric progression
    const commonRatio = Math.pow(upperBound / lowerBound, 1 / (numberOfGrids - 1));
    
    // Generate each grid level
    for (let i = 0; i < numberOfGrids; i++) {
      const price = lowerBound * Math.pow(commonRatio, i);
      
      gridLevels.push({
        price,
        isActive: price !== this.currentPrice
      });
    }
    
    logger.info(`Generated ${gridLevels.length} geometric grid levels from ${lowerBound} to ${upperBound}`);
    return gridLevels;
  }

  /**
   * Generate a volatility-based grid with spacing proportional to historical volatility
   */
  private generateVolatilityBasedGrid(): GridLevel[] {
    const { numberOfGrids, upperBound, lowerBound } = this.config;
    const gridLevels: GridLevel[] = [];
    
    if (!this.historicalVolatility) {
      logger.warn('Historical volatility not provided for volatility-based grid, falling back to linear grid');
      return this.generateLinearGrid();
    }
    
    // Create a volatility curve (for example, a normal distribution)
    const midPoint = (upperBound + lowerBound) / 2;
    const range = upperBound - lowerBound;
    const stdDev = range / 4; // Assuming a 4 standard deviation range
    
    // Calculate grid points based on volatility
    for (let i = 0; i < numberOfGrids; i++) {
      // Normalize i to a range of -2 to 2 (representing std devs)
      const normalizedI = (i / (numberOfGrids - 1)) * 4 - 2;
      
      // Calculate the volatility factor (higher in the center)
      const volatilityFactor = Math.exp(-(normalizedI * normalizedI) / 2);
      
      // Calculate the grid spacing factor
      const spacingFactor = 1 - (volatilityFactor * this.historicalVolatility);
      
      // Calculate the grid position
      const position = i / (numberOfGrids - 1);
      let price: number;
      
      if (position < 0.5) {
        // Lower half of the grid
        const normalizedPosition = position * 2; // 0 to 1
        price = midPoint - (range / 2) * (normalizedPosition * spacingFactor);
      } else {
        // Upper half of the grid
        const normalizedPosition = (position - 0.5) * 2; // 0 to 1
        price = midPoint + (range / 2) * (normalizedPosition * spacingFactor);
      }
      
      gridLevels.push({
        price,
        isActive: price !== this.currentPrice
      });
    }
    
    // Sort grid levels by price
    gridLevels.sort((a, b) => a.price - b.price);
    
    logger.info(`Generated ${gridLevels.length} volatility-based grid levels from ${lowerBound} to ${upperBound}`);
    return gridLevels;
  }

  /**
   * Update grid levels based on new price data or configuration
   */
  public updateGridLevels(gridLevels: GridLevel[], newPrice: number): GridLevel[] {
    // Update current price
    this.currentPrice = newPrice;
    
    // Find the grid level closest to the current price
    let closestLevel = gridLevels[0];
    let minDistance = Math.abs(newPrice - closestLevel.price);
    
    for (let i = 1; i < gridLevels.length; i++) {
      const distance = Math.abs(newPrice - gridLevels[i].price);
      if (distance < minDistance) {
        minDistance = distance;
        closestLevel = gridLevels[i];
      }
    }
    
    // Mark all grid levels as active except the closest one
    return gridLevels.map(level => ({
      ...level,
      isActive: level.price !== closestLevel.price
    }));
  }
}
