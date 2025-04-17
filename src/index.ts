import dotenv from 'dotenv';
import { TradingBot } from './core/TradingBot';
import { generateConfig } from './config/defaultConfig';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { DashboardDataProvider } from './monitoring/DashboardDataProvider';
import { DashboardServer } from './ui/DashboardServer';
import logger from './utils/logger';
import { ExchangeConfig, TradingBotConfig } from './types';

// Load environment variables
dotenv.config();

/**
 * Main application entry point
 */
async function main() {
  try {
    logger.info('Starting Customizable Neutral Gridbot Trading System');
    
    // Load exchange configuration from environment variables
    const exchangeConfig: ExchangeConfig = {
      name: process.env.EXCHANGE_NAME || 'binance',
      apiKey: process.env.API_KEY || '',
      apiSecret: process.env.API_SECRET || '',
      additionalParams: {
        assetPair: process.env.ASSET_PAIR || 'BTC/USDT'
      }
    };
    
    // Create default configuration
    const config = generateConfig();
    
    // Override configuration from environment variables
    if (process.env.TOTAL_INVESTMENT) {
      config.investment.totalInvestment = parseFloat(process.env.TOTAL_INVESTMENT);
    }
    
    if (process.env.ASSET_PAIR) {
      config.investment.assetPair = process.env.ASSET_PAIR;
    }
    
    if (process.env.LEVERAGE) {
      config.investment.leverage = parseFloat(process.env.LEVERAGE);
    }
    
    if (process.env.NUMBER_OF_GRIDS) {
      config.grid.numberOfGrids = parseInt(process.env.NUMBER_OF_GRIDS, 10);
    }
    
    // Initialize the trading bot
    const tradingBot = new TradingBot(config, exchangeConfig);
    
    // Initialize the bot
    await tradingBot.initialize();
    
    // Create performance monitor
    const performanceMonitor = new PerformanceMonitor();
    
    // Create dashboard data provider
    const dataProvider = new DashboardDataProvider(tradingBot, performanceMonitor);
    
    // Create dashboard server
    const dashboardServer = new DashboardServer(
      dataProvider,
      tradingBot,
      parseInt(process.env.PORT || '3000', 10)
    );
    
    // Start the dashboard server
    dashboardServer.start();
    
    // Start the trading bot if AUTO_START is enabled
    if (process.env.AUTO_START === 'true') {
      tradingBot.start(
        parseInt(process.env.TRADING_INTERVAL || '60000', 10)
      );
      logger.info('Trading bot auto-started');
    }
    
    // Auto-save performance data
    performanceMonitor.startAutoSave(
      parseInt(process.env.SAVE_INTERVAL || '300000', 10)
    );
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      
      // Stop the trading bot
      if (tradingBot.isActive()) {
        await tradingBot.stop();
      }
      
      // Stop the dashboard server
      dashboardServer.stop();
      
      // Save performance data
      performanceMonitor.saveData();
      performanceMonitor.stopAutoSave();
      
      logger.info('Shutdown complete');
      process.exit(0);
    });
    
    logger.info('System initialized and ready');
  } catch (error) {
    logger.error('Failed to start the system', error);
    process.exit(1);
  }
}

// Run the application
main();
