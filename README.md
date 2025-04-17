# Customizable Neutral Gridbot Trading System

A sophisticated automated trading solution designed to profit from price volatility within a predefined range. By dividing a price range into multiple grids and placing buy and sell orders at each level, the system aims to capitalize on natural market oscillations while maintaining a neutral market stance.

## Features

- **Flexible Grid Configuration**: Configure the number of grids, price range, and distribution method
- **Multiple Distribution Methods**: Linear, Arithmetic, Geometric, and Volatility-based grid spacing
- **Advanced Risk Management**: Fixed, Dynamic, and Trailing stop loss mechanisms
- **Performance Monitoring**: Real-time metrics and historical analysis
- **Web Dashboard**: Monitor and control the trading bot through a web interface
- **Multiple Exchange Support**: Connect to various exchanges through the CCXT library

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gridbot-trading-system.git
   cd gridbot-trading-system
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy the `.env.example` file to `.env` and configure your settings:
   ```
   cp .env.example .env
   ```

4. Build the project:
   ```
   npm run build
   ```

## Configuration

The system can be configured through the `.env` file or by directly modifying the configuration in code:

### Exchange Configuration
- `EXCHANGE_NAME`: Name of the exchange (e.g., 'binance', 'ftx')
- `API_KEY`: Your API key for the exchange
- `API_SECRET`: Your API secret for the exchange
- `ASSET_PAIR`: Trading pair to use (e.g., 'BTC/USDT')

### Investment Configuration
- `TOTAL_INVESTMENT`: Total amount to invest
- `LEVERAGE`: Leverage multiplier (1x to 100x)

### Grid Configuration
- `NUMBER_OF_GRIDS`: Number of grid levels (5-200)

### Trading Configuration
- `AUTO_START`: Whether to automatically start trading on launch
- `TRADING_INTERVAL`: Interval between trading cycles in milliseconds

### Dashboard Configuration
- `PORT`: Port number for the dashboard server

### Monitoring Configuration
- `SAVE_INTERVAL`: Interval for auto-saving performance data
- `LOG_LEVEL`: Logging level (debug, info, warn, error)

## Usage

### Starting the System

```
npm start
```

This will start both the trading bot and the dashboard server.

### Accessing the Dashboard

Open your browser and navigate to:

```
http://localhost:3000
```

The dashboard provides real-time monitoring of:
- Current grid state and active orders
- Performance metrics
- Trade history and analysis
- Risk management status

### API Endpoints

- `GET /api/status`: Get the current bot status
- `GET /api/grid`: Get grid visualization data
- `GET /api/metrics`: Get performance metrics
- `GET /api/trades`: Get trade analysis
- `POST /api/bot/control`: Control the bot (start/stop)
- `POST /api/bot/config`: Update bot configuration

## Architecture

The system is built with a modular architecture:

- **Core Components**:
  - `GridGenerator`: Creates and manages grid levels
  - `OrderAllocator`: Calculates order sizes and allocates capital
  - `TradingBot`: Orchestrates the entire trading system

- **Risk Management**:
  - `RiskManager`: Implements stop loss mechanisms and risk controls

- **Execution**:
  - `ExecutionEngine`: Handles order placement, monitoring, and execution

- **Monitoring**:
  - `PerformanceMonitor`: Tracks and analyzes bot performance
  - `DashboardDataProvider`: Provides data to the UI

- **API Integration**:
  - `ExchangeConnector`: Interfaces with cryptocurrency exchanges

- **User Interface**:
  - `DashboardServer`: Serves the web UI and handles WebSocket connections

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This software is for educational purposes only. Cryptocurrency trading involves significant risk. Use at your own risk.
