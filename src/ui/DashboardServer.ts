import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { DashboardDataProvider } from '../monitoring/DashboardDataProvider';
import { TradingBot } from '../core/TradingBot';
import { TradingBotConfig, ExchangeConfig } from '../types';
import { generateConfig } from '../config/defaultConfig';
import logger from '../utils/logger';

/**
 * Dashboard Server for serving the UI and handling WebSocket connections
 */
export class DashboardServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private dataProvider: DashboardDataProvider;
  private tradingBot: TradingBot;
  private port: number;

  constructor(
    dataProvider: DashboardDataProvider,
    tradingBot: TradingBot,
    port: number = 3000
  ) {
    this.dataProvider = dataProvider;
    this.tradingBot = tradingBot;
    this.port = port;
    
    // Create Express app
    this.app = express();
    
    // Create HTTP server
    this.server = http.createServer(this.app);
    
    // Create Socket.IO server
    this.io = new SocketIOServer(this.server);
    
    // Configure routes and socket handlers
    this.configureServer();
  }

  /**
   * Configure the server with routes and socket handlers
   */
  private configureServer(): void {
    // Serve static files from the 'public' directory
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Parse JSON request bodies
    this.app.use(express.json());
    
    // Configure API routes
    this.configureApiRoutes();
    
    // Configure Socket.IO handlers
    this.configureSocketHandlers();
  }

  /**
   * Configure API routes
   */
  private configureApiRoutes(): void {
    // Get bot status
    this.app.get('/api/status', (req, res) => {
      const status = this.dataProvider.getBotStatusSummary();
      res.json(status);
    });
    
    // Get grid visualization data
    this.app.get('/api/grid', (req, res) => {
      const gridData = this.dataProvider.getGridVisualizationData();
      res.json(gridData);
    });
    
    // Get performance metrics
    this.app.get('/api/metrics', (req, res) => {
      const metrics = this.dataProvider.getPerformanceMetricsSummary();
      res.json(metrics);
    });
    
    // Get trade analysis
    this.app.get('/api/trades', (req, res) => {
      const analysis = this.dataProvider.getTradeAnalysisSummary();
      res.json(analysis);
    });
    
    // Start/stop trading bot
    this.app.post('/api/bot/control', (req, res) => {
      const { action, interval } = req.body;
      
      if (action === 'start') {
        if (!this.tradingBot.isActive()) {
          this.tradingBot.start(interval || 60000);
          res.json({ success: true, message: 'Trading bot started' });
        } else {
          res.json({ success: false, message: 'Trading bot is already running' });
        }
      } else if (action === 'stop') {
        if (this.tradingBot.isActive()) {
          this.tradingBot.stop();
          res.json({ success: true, message: 'Trading bot stopped' });
        } else {
          res.json({ success: false, message: 'Trading bot is not running' });
        }
      } else {
        res.status(400).json({ success: false, message: 'Invalid action' });
      }
    });
    
    // Update bot configuration
    this.app.post('/api/bot/config', (req, res) => {
      try {
        const { config, exchangeConfig } = req.body;
        
        // Generate complete config with defaults for missing values
        const completeConfig = generateConfig(config as Partial<TradingBotConfig>);
        
        // Save configuration for later use
        // (In a real application, this would be persisted to disk)
        
        res.json({ success: true, message: 'Configuration updated' });
      } catch (error) {
        res.status(400).json({ 
          success: false, 
          message: `Failed to update configuration: ${(error as Error).message}` 
        });
      }
    });
  }

  /**
   * Configure Socket.IO event handlers
   */
  private configureSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`New client connected: ${socket.id}`);
      
      // Send initial data to the client
      this.sendInitialData(socket);
      
      // Handle client disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
    
    // Forward data provider events to connected clients
    this.dataProvider.on('tradingStateUpdate', (data) => {
      this.io.emit('tradingStateUpdate', data);
    });
    
    this.dataProvider.on('metricsUpdate', (data) => {
      this.io.emit('metricsUpdate', data);
    });
    
    this.dataProvider.on('tradesUpdate', (data) => {
      this.io.emit('tradesUpdate', data);
    });
  }

  /**
   * Send initial data to a newly connected client
   */
  private sendInitialData(socket: any): void {
    // Send bot status
    const status = this.dataProvider.getBotStatusSummary();
    socket.emit('botStatus', status);
    
    // Send grid visualization data
    const gridData = this.dataProvider.getGridVisualizationData();
    socket.emit('gridData', gridData);
    
    // Send performance metrics
    const metrics = this.dataProvider.getPerformanceMetricsSummary();
    socket.emit('performanceMetrics', metrics);
    
    // Send trade analysis
    const analysis = this.dataProvider.getTradeAnalysisSummary();
    socket.emit('tradeAnalysis', analysis);
  }

  /**
   * Start the dashboard server
   */
  public start(): void {
    this.server.listen(this.port, () => {
      logger.info(`Dashboard server listening on port ${this.port}`);
    });
    
    // Start emitting data updates
    this.dataProvider.startUpdates();
  }

  /**
   * Stop the dashboard server
   */
  public stop(): void {
    // Stop emitting data updates
    this.dataProvider.stopUpdates();
    
    // Close the server
    this.server.close(() => {
      logger.info('Dashboard server stopped');
    });
  }
}


// Add proper Socket.IO type imports and definitions
import { Socket } from 'socket.io';

/**
 * Send initial data to a newly connected client with proper typing
 */
private sendInitialData(socket: Socket): void {
  // Send bot status
  const status = this.dataProvider.getBotStatusSummary();
  socket.emit('botStatus', status);
  
  // Send grid visualization data
  const gridData = this.dataProvider.getGridVisualizationData();
  socket.emit('gridData', gridData);
  
  // Send performance metrics
  const metrics = this.dataProvider.getPerformanceMetricsSummary();
  socket.emit('performanceMetrics', metrics);
  
  // Send trade analysis
  const analysis = this.dataProvider.getTradeAnalysisSummary();
  socket.emit('tradeAnalysis', analysis);
}

/**
 * Configure Socket.IO event handlers with proper typings
 */
private configureSocketHandlers(): void {
  this.io.on('connection', (socket: Socket) => {
    logger.info(`New client connected: ${socket.id}`);
    
    // Send initial data to the client
    this.sendInitialData(socket);
    
    // Handle client disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
  
  // Forward data provider events to connected clients
  this.dataProvider.on('tradingStateUpdate', (data: TradingState) => {
    this.io.emit('tradingStateUpdate', data);
  });
  
  this.dataProvider.on('metricsUpdate', (data: PerformanceMetrics) => {
    this.io.emit('metricsUpdate', data);
  });
  
  this.dataProvider.on('tradesUpdate', (data: HistoricalTrade[]) => {
    this.io.emit('tradesUpdate', data);
  });
}
