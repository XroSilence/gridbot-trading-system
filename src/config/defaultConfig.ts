import { 
  TradingBotConfig, 
  GridDistributionMethod, 
  OrderAllocationMethod, 
  OrderType, 
  StopLossMethod,
  GridAdjustmentTrigger
} from '../types';

/**
 * Default configuration for the trading bot
 */
export const defaultConfig: TradingBotConfig = {
  investment: {
    totalInvestment: 10000,  // Default investment amount of $10,000
    assetPair: 'BTC/USD',   // Default trading pair
    leverage: 1,            // Default leverage of 1x (no leverage)
  },
  grid: {
    numberOfGrids: 20,      // Default number of grid levels
    upperBound: 0,          // Will be auto-calculated if 0
    lowerBound: 0,          // Will be auto-calculated if 0
    autoRange: true,        // Auto-calculate range based on historical volatility
    distributionMethod: GridDistributionMethod.LINEAR,  // Default grid distribution method
  },
  order: {
    allocationMethod: OrderAllocationMethod.EQUAL,  // Default equal allocation across grids
    orderType: OrderType.LIMIT,                    // Default order type
  },
  riskManagement: {
    basicStopLoss: {
      enabled: true,
      percentage: 5,        // 5% stop loss
      method: StopLossMethod.HARD,
    },
    dynamicStopLoss: {
      enabled: true,
      initialRiskThreshold: 3,  // 3% initial risk threshold
      expansionFactor: 0.5,     // Default expansion factor
      maximumExpansion: 10,     // Maximum expansion of 10%
    },
    trailingStopLoss: {
      enabled: true,
      trailingDistance: 2,      // 2% trailing distance
      activationThreshold: 1,   // Activate after 1% profit
      isDiscrete: false,        // Continuous trailing by default
    }
  },
  positionManagement: {
    rebalancingEnabled: true,
    driftCorrectionEnabled: true,
    gridAdjustment: {
      enabled: true,
      trigger: GridAdjustmentTrigger.VOLATILITY_BASED,
      volatilityThreshold: 5,   // 5% volatility threshold
      timeInterval: 3600000,    // 1 hour in milliseconds
      profitThreshold: 2,       // 2% profit threshold
    }
  }
};

/**
 * Generate a configuration object with user-provided values,
 * using default values for any missing properties
 */
export function generateConfig(userConfig: Partial<TradingBotConfig> = {}): TradingBotConfig {
  return {
    investment: {
      ...defaultConfig.investment,
      ...userConfig.investment,
    },
    grid: {
      ...defaultConfig.grid,
      ...userConfig.grid,
    },
    order: {
      ...defaultConfig.order,
      ...userConfig.order,
    },
    riskManagement: {
      basicStopLoss: {
        ...defaultConfig.riskManagement.basicStopLoss,
        ...userConfig.riskManagement?.basicStopLoss,
      },
      dynamicStopLoss: {
        ...defaultConfig.riskManagement.dynamicStopLoss,
        ...userConfig.riskManagement?.dynamicStopLoss,
      },
      trailingStopLoss: {
        ...defaultConfig.riskManagement.trailingStopLoss,
        ...userConfig.riskManagement?.trailingStopLoss,
      }
    },
    positionManagement: {
      ...defaultConfig.positionManagement,
      gridAdjustment: {
        ...defaultConfig.positionManagement.gridAdjustment,
        ...userConfig.positionManagement?.gridAdjustment,
      },
      ...userConfig.positionManagement,
    }
  };
}

/**
 * Validate the configuration object to ensure it meets the system requirements
 * Throws an error if the configuration is invalid
 */
export function validateConfig(config: TradingBotConfig): void {
  // Validate grid count
  if (config.grid.numberOfGrids < 5) {
    throw new Error('Number of grids must be at least 5');
  }
  if (config.grid.numberOfGrids > 200) {
    throw new Error('Number of grids cannot exceed 200');
  }

  // Validate leverage
  if (config.investment.leverage < 1) {
    throw new Error('Leverage must be at least 1x');
  }
  if (config.investment.leverage > 100) {
    throw new Error('Leverage cannot exceed 100x');
  }

  // Validate price range if auto-range is disabled
  if (!config.grid.autoRange) {
    if (config.grid.upperBound <= config.grid.lowerBound) {
      throw new Error('Upper bound must be greater than lower bound');
    }
    if (config.grid.lowerBound <= 0) {
      throw new Error('Lower bound must be greater than 0');
    }
  }

  // Validate custom allocation pattern if needed
  if (config.order.allocationMethod === OrderAllocationMethod.CUSTOM) {
    if (!config.order.customAllocationPattern || config.order.customAllocationPattern.length === 0) {
      throw new Error('Custom allocation method requires a customAllocationPattern');
    }
    if (config.order.customAllocationPattern.length !== config.grid.numberOfGrids) {
      throw new Error('Custom allocation pattern length must match the number of grids');
    }
  }

  // Validate stop loss values
  if (config.riskManagement.basicStopLoss.enabled && config.riskManagement.basicStopLoss.percentage <= 0) {
    throw new Error('Stop loss percentage must be greater than 0');
  }
  
  if (config.riskManagement.dynamicStopLoss.enabled) {
    if (config.riskManagement.dynamicStopLoss.initialRiskThreshold <= 0) {
      throw new Error('Initial risk threshold must be greater than 0');
    }
    if (config.riskManagement.dynamicStopLoss.expansionFactor <= 0) {
      throw new Error('Expansion factor must be greater than 0');
    }
    if (config.riskManagement.dynamicStopLoss.maximumExpansion <= 0) {
      throw new Error('Maximum expansion must be greater than 0');
    }
  }
  
  if (config.riskManagement.trailingStopLoss.enabled) {
    if (config.riskManagement.trailingStopLoss.trailingDistance <= 0) {
      throw new Error('Trailing distance must be greater than 0');
    }
    if (config.riskManagement.trailingStopLoss.activationThreshold < 0) {
      throw new Error('Activation threshold must be greater than or equal to 0');
    }
  }
}
