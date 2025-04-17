import express from 'express';
import path from 'path';
import fs from 'fs';
import { dashboardTemplate, dashboardJsTemplate } from './DashboardTemplate';
import logger from '../utils/logger';

/**
 * UI Server for serving the web interface
 */
export class UiServer {
  private app: express.Application;
  private port: number;
  private staticDir: string;

  constructor(port: number = 8080, staticDir: string = path.join(process.cwd(), 'static')) {
    this.port = port;
    this.staticDir = staticDir;
    this.app = express();
    
    // Create static directory if it doesn't exist
    this.ensureStaticDirectory();
    
    // Setup middleware
    this.setupMiddleware();
    
    // Setup routes
    this.setupRoutes();
  }

  /**
   * Ensure static directory exists
   */
  private ensureStaticDirectory(): void {
    // Create static directory if it doesn't exist
    if (!fs.existsSync(this.staticDir)) {
      fs.mkdirSync(this.staticDir, { recursive: true });
    }
    
    // Create js directory if it doesn't exist
    const jsDir = path.join(this.staticDir, 'js');
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    // Write dashboard.js to static/js directory
    fs.writeFileSync(path.join(jsDir, 'dashboard.js'), dashboardJsTemplate);
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Serve static files
    this.app.use(express.static(this.staticDir));
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Serve dashboard
    this.app.get('/', (req, res) => {
      res.send(dashboardTemplate);
    });
  }

  /**
   * Start the UI server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      logger.info(`UI Server started on port ${this.port}`);
    });
  }

  /**
   * Stop the UI server
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      // No need to do anything special to stop Express
      resolve();
    });
  }
}
