import ccxt from 'ccxt';
import { ExchangeConfig, OrderType } from '../types';
import logger from '../utils/logger';

/**
 * Interface for order placement
 */
interface OrderRequest {
  price: number;
  size: number;
  side: 'buy' | 'sell';
  type: OrderType;
}

/**
 * Exchange Connector class for interacting with cryptocurrency exchanges
 */
export class ExchangeConnector {
  private exchange: ccxt.Exchange;
  private exchangeConfig: ExchangeConfig;

  constructor(config: ExchangeConfig) {
    this.exchangeConfig = config;
    
    // Initialize the exchange instance
    this.exchange = this.createExchangeInstance(config);
  }

  /**
   * Create an exchange instance based on the configuration
   */
  private createExchangeInstance(config: ExchangeConfig): ccxt.Exchange {
    if (!ccxt[config.name]) {
      throw new Error(`Exchange ${config.name} is not supported by CCXT`);
    }
    
    // Initialize the exchange with API credentials
    const exchange = new ccxt[config.name]({
      apiKey: config.apiKey,
      secret: config.apiSecret,
      ...config.additionalParams
    });
    
    logger.info(`Created exchange instance for ${config.name}`);
    return exchange;
  }

  /**
   * Get the current market price for the asset pair
   */
  public async getCurrentPrice(): Promise<number> {
    try {
      // Get current ticker data for the asset pair
      const ticker = await this.exchange.fetchTicker(this.exchangeConfig.additionalParams?.assetPair || 'BTC/USD');
      
      // Return the last traded price
      return ticker.last || 0;
    } catch (error) {
      logger.error('Failed to get current price', error);
      throw error;
    }
  }

  /**
   * Place an order on the exchange
   * @param order Order request parameters
   * @returns Exchange order ID
   */
  public async placeOrder(order: OrderRequest): Promise<string> {
    try {
      const assetPair = this.exchangeConfig.additionalParams?.assetPair || 'BTC/USD';
      const orderType = order.type === OrderType.LIMIT ? 'limit' : 'market';
      
      // Place the order on the exchange
      const response = await this.exchange.createOrder(
        assetPair,
        orderType,
        order.side,
        order.size,
        order.price
      );
      
      logger.info(`Placed ${order.side} order on ${this.exchangeConfig.name} for ${order.size} at ${order.price}`);
      return response.id;
    } catch (error) {
      logger.error('Failed to place order', error);
      throw error;
    }
  }

  /**
   * Get the status of an order
   * @param orderId Exchange order ID
   * @returns Status of the order (pending, filled, canceled)
   */
  public async getOrderStatus(orderId: string): Promise<'pending' | 'filled' | 'canceled'> {
    try {
      // Fetch the order from the exchange
      const order = await this.exchange.fetchOrder(orderId);
      
      // Map exchange status to our status format
      if (order.status === 'closed' || order.status === 'filled') {
        return 'filled';
      } else if (order.status === 'canceled') {
        return 'canceled';
      } else {
        return 'pending';
      }
    } catch (error) {
      logger.error(`Failed to get status for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Cancel an order on the exchange
   * @param orderId Exchange order ID
   */
  public async cancelOrder(orderId: string): Promise<void> {
    try {
      // Cancel the order on the exchange
      await this.exchange.cancelOrder(orderId);
      logger.info(`Canceled order ${orderId} on ${this.exchangeConfig.name}`);
    } catch (error) {
      logger.error(`Failed to cancel order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Get historical price data for a time period
   * @param timeframe Timeframe for historical data (e.g., '1h', '1d')
   * @param limit Number of candles to fetch
   * @returns Array of closing prices
   */
  public async getHistoricalPrices(timeframe: string = '1h', limit: number = 100): Promise<number[]> {
    try {
      const assetPair = this.exchangeConfig.additionalParams?.assetPair || 'BTC/USD';
      
      // Fetch historical OHLCV data from the exchange
      const ohlcv = await this.exchange.fetchOHLCV(assetPair, timeframe, undefined, limit);
      
      // Extract closing prices (index 4 in OHLCV data)
      const closingPrices = ohlcv.map(candle => candle[4]);
      
      logger.info(`Fetched ${closingPrices.length} historical prices for ${assetPair}`);
      return closingPrices;
    } catch (error) {
      logger.error('Failed to fetch historical prices', error);
      throw error;
    }
  }

  /**
   * Calculate historical volatility based on price data
   * @param days Number of days to calculate volatility for
   * @returns Historical volatility as a decimal
   */
  public async calculateHistoricalVolatility(days: number = 30): Promise<number> {
    try {
      // Fetch daily prices for the specified period
      const prices = await this.getHistoricalPrices('1d', days);
      
      if (prices.length < 2) {
        throw new Error('Not enough price data to calculate volatility');
      }
      
      // Calculate daily returns
      const returns: number[] = [];
      for (let i = 1; i < prices.length; i++) {
        const dailyReturn = Math.log(prices[i] / prices[i - 1]);
        returns.push(dailyReturn);
      }
      
      // Calculate variance
      const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
      const variance = returns.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / returns.length;
      
      // Calculate annualized volatility
      const volatility = Math.sqrt(variance * 365);
      
      logger.info(`Calculated historical volatility: ${volatility}`);
      return volatility;
    } catch (error) {
      logger.error('Failed to calculate historical volatility', error);
      throw error;
    }
  }

  /**
   * Get account balance
   * @returns Account balance for the base and quote currencies
   */
  public async getAccountBalance(): Promise<{ base: number; quote: number }> {
    try {
      const assetPair = this.exchangeConfig.additionalParams?.assetPair || 'BTC/USD';
      const [baseCurrency, quoteCurrency] = assetPair.split('/');
      
      // Fetch balance from the exchange
      const balance = await this.exchange.fetchBalance();
      
      const baseBalance = balance[baseCurrency]?.free || 0;
      const quoteBalance = balance[quoteCurrency]?.free || 0;
      
      logger.info(`Fetched account balance: ${baseBalance} ${baseCurrency}, ${quoteBalance} ${quoteCurrency}`);
      
      return {
        base: baseBalance,
        quote: quoteBalance
      };
    } catch (error) {
      logger.error('Failed to fetch account balance', error);
      throw error;
    }
  }
}


// Type safety improvement for CCXT dynamic exchange instantiation
interface CCXTExchanges {
  [key: string]: new (config: any) => ccxt.Exchange;
}

/**
 * Create an exchange instance based on the configuration with proper typings
 */
private createExchangeInstance(config: ExchangeConfig): ccxt.Exchange {
  const exchanges = ccxt as unknown as CCXTExchanges;
  
  if (!exchanges[config.name]) {
    throw new Error(`Exchange ${config.name} is not supported by CCXT`);
  }
  
  // Initialize the exchange with API credentials
  const ExchangeClass = exchanges[config.name];
  const exchange = new ExchangeClass({
    apiKey: config.apiKey,
    secret: config.apiSecret,
    ...config.additionalParams
  });
  
  logger.info(`Created exchange instance for ${config.name}`);
  return exchange;
}
