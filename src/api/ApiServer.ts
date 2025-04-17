import express, { Request, Response } from 'express';
import http from 'http';
import socketIo from 'socket.io';
import { TradingBot } from '../core/TradingBot';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';
import { TradingBotConfig, ExchangeConfig } from '../types';
import { generateConfig } from '../config/defaultConfig';
import logger from '../utils/logger';

/**
 * API Server for exposing the trading system functionality via REST and WebSockets
 */
export class ApiServer {
  private app: express.Application;
  private server: http.Server;
  private io: socketIo.Server;
  private port: number;
  private tradingBot: TradingBot | null = null;
  private performanceMonitor: PerformanceMonitor;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize Express
    this.app = express();
    this.app.use(express.json());
    
    // Initialize HTTP server
    this.server = http.createServer(this.app);
    
    // Initialize Socket.IO
    this.io = new socketIo.Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Setup API routes
    this.setupRoutes();
    
    // Setup WebSocket events
    this.setupSocketEvents();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now()
      });
    });
    
    // API version endpoint
    this.app.get('/version', (req: Request, res: Response) => {
      res.status(200).json({
        version: '1.0.0',
        name: 'Customizable Neutral Gridbot Trading System'
      });
    });
    
    // Start trading bot
    this.app.post('/bot/start', (req: Request, res: Response) => {
      try {
        const userConfig = req.body.config as Partial<TradingBotConfig>;
        const exchangeConfig = req.body.exchangeConfig as ExchangeConfig;
        
        if (!exchangeConfig || !exchangeConfig.apiKey || !exchangeConfig.apiSecret) {
          return res.status(400).json({
            error: 'Exchange configuration is required'
          });
        }
        
        // Generate config with user overrides
        const config = generateConfig(userConfig);
        
        // Create and initialize trading bot
        this.tradingBot = new TradingBot(config, exchangeConfig);
        
        // Start initialization process
        this.tradingBot.initialize()
          .then(() => {
            // Start the bot with the specified interval
            const interval = req.body.interval || 60000;
            this.tradingBot?.start(interval);
            
            // Start performance monitoring
            this.startPerformanceMonitoring();
            
            res.status(200).json({
              status: 'started',
              config
            });
          })
          .catch(error => {
            logger.error('Failed to initialize trading bot', error);
            res.status(500).json({
              error: 'Failed to initialize trading bot',
              message: error.message
            });
          });
      } catch (error: any) {
        logger.error('Failed to start trading bot', error);
        res.status(500).json({
          error: 'Failed to start trading bot',
          message: error.message
        });
      }
    });
    
    // Stop trading bot
    this.app.post('/bot/stop', async (req: Request, res: Response) => {
      try {
        if (!this.tradingBot) {
          return res.status(400).json({
            error: 'Trading bot is not running'
          });
        }
        
        await this.tradingBot.stop();
        
        // Stop performance monitoring
        this.stopPerformanceMonitoring();
        
        res.status(200).json({
          status: 'stopped'
        });
      } catch (error: any) {
        logger.error('Failed to stop trading bot', error);
        res.status(500).json({
          error: 'Failed to stop trading bot',
          message: error.message
        });
      }
    });
    
    // Get trading bot status
    this.app.get('/bot/status', (req: Request, res: Response) => {
      if (!this.tradingBot) {
        return res.status(200).json({
          status: 'not_running'
        });
      }
      
      res.status(200).json({
        status: this.tradingBot.isActive() ? 'running' : 'stopped',
        tradingState: this.tradingBot.getTradingState(),
        metrics: this.tradingBot.getPerformanceMetrics()
      });
    });
    
    // Get performance metrics
    this.app.get('/metrics', (req: Request, res: Response) => {
      const metrics = this.performanceMonitor.getLatestMetrics();
      
      res.status(200).json({
        metrics,
        summary: this.performanceMonitor.calculatePerformanceSummary()
      });
    });
    
    // Get historical performance data
    this.app.get('/metrics/history', (req: Request, res: Response) => {
      const metricsHistory = this.performanceMonitor.getMetricsHistory();
      
      res.status(200).json({
        history: metricsHistory
      });
    });
    
    // Get historical trades
    this.app.get('/trades', (req: Request, res: Response) => {
      const trades = this.performanceMonitor.getHistoricalTrades();
      
      res.status(200).json({
        trades,
        count: trades.length
      });
    });
    
    // Get trade analysis
    this.app.get('/analysis/trades', (req: Request, res: Response) => {
      const heatMap = this.tradingBot 
        ? this.performanceMonitor.generateProfitabilityHeatMap(this.tradingBot.getTradingState().gridLevels)
        : [];
      
      const frequencyDistribution = this.performanceMonitor.generateTradeFrequencyDistribution();
      
      res.status(200).json({
        heatMap,
        frequencyDistribution
      });
    });
    
    // Get stop loss analysis
    this.app.get('/analysis/stoploss', (req: Request, res: Response) => {
      const stopLossEffectiveness = this.performanceMonitor.calculateStopLossEffectiveness();
      const stopLossExpansionTimeline = this.performanceMonitor.generateStopLossExpansionTimeline();
      
      res.status(200).json({
        effectiveness: stopLossEffectiveness,
        timeline: stopLossExpansionTimeline
      });
    });
  }

  /**
   * Setup WebSocket events
   */
  private setupSocketEvents(): void {
    this.io.on('connection', (socket) => {
      logger.info('Client connected');
      
      // Send initial data to the client
      if (this.tradingBot) {
        socket.emit('tradingState', this.tradingBot.getTradingState());
        socket.emit('metrics', this.tradingBot.getPerformanceMetrics());
      }
      
      // Handle client disconnect
      socket.on('disconnect', () => {
        logger.info('Client disconnected');
      });
      
      // Subscribe to real-time updates
      socket.on('subscribe', (channel) => {
        logger.info(`Client subscribed to ${channel}`);
      });
      
      // Unsubscribe from real-time updates
      socket.on('unsubscribe', (channel) => {
        logger.info(`Client unsubscribed from ${channel}`);
      });
    });
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      if (this.tradingBot) {
        const tradingState = this.tradingBot.getTradingState();
        const metrics = this.tradingBot.getPerformanceMetrics();
        const trades = this.tradingBot.getHistoricalTrades();
        
        // Record data for analysis
        this.performanceMonitor.recordTradingState(tradingState);
        this.performanceMonitor.recordMetrics(metrics);
        
        // Record new trades
        const recordedTrades = this.performanceMonitor.getHistoricalTrades();
        const newTrades = trades.filter(trade => 
          !recordedTrades.some(recorded => 
            recorded.timestamp === trade.timestamp && 
            recorded.price === trade.price && 
            recorded.side === trade.side
          )
        );
        
        for (const trade of newTrades) {
          this.performanceMonitor.recordTrade(trade);
        }
        
        // Emit real-time updates
        this.io.emit('tradingState', tradingState);
        this.io.emit('metrics', metrics);
        
        if (newTrades.length > 0) {
          this.io.emit('trades', newTrades);
        }
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop performance monitoring
   */
  private stopPerformanceMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Start the API server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`API Server started on port ${this.port}`);
    });
  }

  /**
   * Stop the API server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop the trading bot if it's running
      if (this.tradingBot && this.tradingBot.isActive()) {
        this.tradingBot.stop()
          .then(() => {
            this.stopPerformanceMonitoring();
            this.server.close(() => resolve());
          })
          .catch(reject);
      } else {
        this.stopPerformanceMonitoring();
        this.server.close(() => resolve());
      }
    });
  }
}
