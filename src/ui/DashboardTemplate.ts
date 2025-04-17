/**
 * Dashboard Template - HTML template for the web interface
 * This is a simple template that can be enhanced with a proper frontend framework
 */
export const dashboardTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gridbot Trading System Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
        }
        .navbar {
            background-color: #343a40;
        }
        .card {
            margin-bottom: 1.5rem;
            box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
        }
        .metrics-card {
            min-height: 150px;
        }
        .chart-container {
            height: 300px;
        }
        .grid-visualization {
            height: 400px;
            border: 1px solid #dee2e6;
            border-radius: 0.25rem;
            position: relative;
            overflow: hidden;
        }
        .grid-level {
            position: absolute;
            width: 100%;
            height: 1px;
            background-color: #dee2e6;
        }
        .grid-buy {
            background-color: #28a745;
            height: 2px;
        }
        .grid-sell {
            background-color: #dc3545;
            height: 2px;
        }
        .grid-current-price {
            background-color: #007bff;
            height: 3px;
        }
        .price-label {
            position: absolute;
            right: 0;
            margin-top: -10px;
            background-color: #ffffff;
            padding: 0 5px;
            font-size: 12px;
            color: #6c757d;
        }
        #order-book {
            max-height: 300px;
            overflow-y: auto;
        }
        #trade-history {
            max-height: 300px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container">
            <a class="navbar-brand" href="#">Gridbot Trading System</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link active" href="#">Dashboard</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#configModal">Configuration</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#performanceModal">Performance</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#logsModal">Logs</a>
                    </li>
                </ul>
                <div class="d-flex">
                    <span class="navbar-text me-2" id="connection-status">
                        <span class="badge bg-success">Connected</span>
                    </span>
                    <button id="start-bot" class="btn btn-success me-2">Start Bot</button>
                    <button id="stop-bot" class="btn btn-danger" disabled>Stop Bot</button>
                </div>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card metrics-card">
                    <div class="card-body">
                        <h5 class="card-title">Unrealized P&L</h5>
                        <h2 class="text-primary" id="unrealized-pnl">$0.00</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card metrics-card">
                    <div class="card-body">
                        <h5 class="card-title">Realized P&L</h5>
                        <h2 class="text-success" id="realized-pnl">$0.00</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card metrics-card">
                    <div class="card-body">
                        <h5 class="card-title">Current Price</h5>
                        <h2 class="text-info" id="current-price">$0.00</h2>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card metrics-card">
                    <div class="card-body">
                        <h5 class="card-title">Grid Utilization</h5>
                        <h2 class="text-warning" id="grid-utilization">0%</h2>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Price Chart</h5>
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-timeframe="1h">1H</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-timeframe="4h">4H</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-timeframe="1d">1D</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary active" data-timeframe="all">All</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="chart-container">
                            <canvas id="price-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0">Grid Visualization</h5>
                    </div>
                    <div class="card-body">
                        <div class="grid-visualization" id="grid-visualization">
                            <!-- Grid levels will be inserted here dynamically -->
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Active Orders</h5>
                    </div>
                    <div class="card-body">
                        <div id="order-book">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Price</th>
                                        <th>Size</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="order-book-body">
                                    <!-- Orders will be inserted here dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="mb-0">Recent Trades</h5>
                    </div>
                    <div class="card-body">
                        <div id="trade-history">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Side</th>
                                        <th>Price</th>
                                        <th>Profit</th>
                                    </tr>
                                </thead>
                                <tbody id="trade-history-body">
                                    <!-- Trades will be inserted here dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Configuration Modal -->
    <div class="modal fade" id="configModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Bot Configuration</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="config-form">
                        <ul class="nav nav-tabs" id="configTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="investment-tab" data-bs-toggle="tab" data-bs-target="#investment" type="button">Investment</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="grid-tab" data-bs-toggle="tab" data-bs-target="#grid" type="button">Grid</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="risk-tab" data-bs-toggle="tab" data-bs-target="#risk" type="button">Risk Management</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="position-tab" data-bs-toggle="tab" data-bs-target="#position" type="button">Position Management</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="exchange-tab" data-bs-toggle="tab" data-bs-target="#exchange" type="button">Exchange</button>
                            </li>
                        </ul>
                        <div class="tab-content p-3" id="configTabsContent">
                            <div class="tab-pane fade show active" id="investment" role="tabpanel">
                                <div class="mb-3">
                                    <label for="totalInvestment" class="form-label">Total Investment</label>
                                    <input type="number" class="form-control" id="totalInvestment" name="totalInvestment" value="10000" required>
                                </div>
                                <div class="mb-3">
                                    <label for="assetPair" class="form-label">Asset Pair</label>
                                    <input type="text" class="form-control" id="assetPair" name="assetPair" value="BTC/USD" required>
                                </div>
                                <div class="mb-3">
                                    <label for="leverage" class="form-label">Leverage</label>
                                    <input type="number" class="form-control" id="leverage" name="leverage" value="1" min="1" max="100" required>
                                    <div class="form-text text-danger" id="leverage-warning" style="display: none;">Warning: High leverage increases risk of liquidation</div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="grid" role="tabpanel">
                                <div class="mb-3">
                                    <label for="numberOfGrids" class="form-label">Number of Grids</label>
                                    <input type="number" class="form-control" id="numberOfGrids" name="numberOfGrids" value="20" min="5" max="200" required>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="autoRange" name="autoRange" checked>
                                        <label class="form-check-label" for="autoRange">Auto Range</label>
                                    </div>
                                </div>
                                <div id="manual-range" style="display: none;">
                                    <div class="mb-3">
                                        <label for="upperBound" class="form-label">Upper Bound</label>
                                        <input type="number" class="form-control" id="upperBound" name="upperBound" value="0" step="0.01">
                                    </div>
                                    <div class="mb-3">
                                        <label for="lowerBound" class="form-label">Lower Bound</label>
                                        <input type="number" class="form-control" id="lowerBound" name="lowerBound" value="0" step="0.01">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="distributionMethod" class="form-label">Grid Distribution Method</label>
                                    <select class="form-select" id="distributionMethod" name="distributionMethod" required>
                                        <option value="linear">Linear</option>
                                        <option value="arithmetic">Arithmetic</option>
                                        <option value="geometric">Geometric</option>
                                        <option value="volatility-based">Volatility-based</option>
                                    </select>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="risk" role="tabpanel">
                                <h6>Basic Stop Loss</h6>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="basicStopLossEnabled" name="basicStopLossEnabled" checked>
                                        <label class="form-check-label" for="basicStopLossEnabled">Enable Basic Stop Loss</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="basicStopLossPercentage" class="form-label">Stop Loss Percentage</label>
                                    <input type="number" class="form-control" id="basicStopLossPercentage" name="basicStopLossPercentage" value="5" min="0.1" step="0.1" required>
                                </div>
                                <div class="mb-3">
                                    <label for="basicStopLossMethod" class="form-label">Stop Loss Method</label>
                                    <select class="form-select" id="basicStopLossMethod" name="basicStopLossMethod" required>
                                        <option value="hard">Hard (Immediate liquidation)</option>
                                        <option value="soft">Soft (Gradual reduction)</option>
                                    </select>
                                </div>
                                
                                <h6 class="mt-4">Dynamic Stop Loss</h6>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="dynamicStopLossEnabled" name="dynamicStopLossEnabled" checked>
                                        <label class="form-check-label" for="dynamicStopLossEnabled">Enable Dynamic Stop Loss</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="initialRiskThreshold" class="form-label">Initial Risk Threshold (%)</label>
                                    <input type="number" class="form-control" id="initialRiskThreshold" name="initialRiskThreshold" value="3" min="0.1" step="0.1" required>
                                </div>
                                <div class="mb-3">
                                    <label for="expansionFactor" class="form-label">Expansion Factor</label>
                                    <input type="number" class="form-control" id="expansionFactor" name="expansionFactor" value="0.5" min="0.1" step="0.1" required>
                                </div>
                                <div class="mb-3">
                                    <label for="maximumExpansion" class="form-label">Maximum Expansion (%)</label>
                                    <input type="number" class="form-control" id="maximumExpansion" name="maximumExpansion" value="10" min="1" step="0.5" required>
                                </div>
                                
                                <h6 class="mt-4">Trailing Stop Loss</h6>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="trailingStopLossEnabled" name="trailingStopLossEnabled" checked>
                                        <label class="form-check-label" for="trailingStopLossEnabled">Enable Trailing Stop Loss</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="trailingDistance" class="form-label">Trailing Distance (%)</label>
                                    <input type="number" class="form-control" id="trailingDistance" name="trailingDistance" value="2" min="0.1" step="0.1" required>
                                </div>
                                <div class="mb-3">
                                    <label for="activationThreshold" class="form-label">Activation Threshold (%)</label>
                                    <input type="number" class="form-control" id="activationThreshold" name="activationThreshold" value="1" min="0" step="0.1" required>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="isDiscrete" name="isDiscrete">
                                        <label class="form-check-label" for="isDiscrete">Discrete Trailing</label>
                                    </div>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="position" role="tabpanel">
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="rebalancingEnabled" name="rebalancingEnabled" checked>
                                        <label class="form-check-label" for="rebalancingEnabled">Enable Rebalancing</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="driftCorrectionEnabled" name="driftCorrectionEnabled" checked>
                                        <label class="form-check-label" for="driftCorrectionEnabled">Enable Drift Correction</label>
                                    </div>
                                </div>
                                
                                <h6 class="mt-4">Grid Adjustment</h6>
                                <div class="mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="gridAdjustmentEnabled" name="gridAdjustmentEnabled" checked>
                                        <label class="form-check-label" for="gridAdjustmentEnabled">Enable Grid Adjustment</label>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="gridAdjustmentTrigger" class="form-label">Adjustment Trigger</label>
                                    <select class="form-select" id="gridAdjustmentTrigger" name="gridAdjustmentTrigger" required>
                                        <option value="time-based">Time-based</option>
                                        <option value="volatility-based" selected>Volatility-based</option>
                                        <option value="profit-threshold">Profit Threshold</option>
                                    </select>
                                </div>
                                <div class="mb-3 trigger-param time-based" style="display: none;">
                                    <label for="timeInterval" class="form-label">Time Interval (minutes)</label>
                                    <input type="number" class="form-control" id="timeInterval" name="timeInterval" value="60" min="1" required>
                                </div>
                                <div class="mb-3 trigger-param volatility-based">
                                    <label for="volatilityThreshold" class="form-label">Volatility Threshold (%)</label>
                                    <input type="number" class="form-control" id="volatilityThreshold" name="volatilityThreshold" value="5" min="0.1" step="0.1" required>
                                </div>
                                <div class="mb-3 trigger-param profit-threshold" style="display: none;">
                                    <label for="profitThreshold" class="form-label">Profit Threshold (%)</label>
                                    <input type="number" class="form-control" id="profitThreshold" name="profitThreshold" value="2" min="0.1" step="0.1" required>
                                </div>
                            </div>
                            <div class="tab-pane fade" id="exchange" role="tabpanel">
                                <div class="mb-3">
                                    <label for="exchangeName" class="form-label">Exchange</label>
                                    <select class="form-select" id="exchangeName" name="exchangeName" required>
                                        <option value="binance">Binance</option>
                                        <option value="coinbasepro">Coinbase Pro</option>
                                        <option value="kraken">Kraken</option>
                                        <option value="ftx">FTX</option>
                                        <option value="bybit">Bybit</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="apiKey" class="form-label">API Key</label>
                                    <input type="text" class="form-control" id="apiKey" name="apiKey" required>
                                </div>
                                <div class="mb-3">
                                    <label for="apiSecret" class="form-label">API Secret</label>
                                    <input type="password" class="form-control" id="apiSecret" name="apiSecret" required>
                                </div>
                                <div class="mb-3">
                                    <label for="updateInterval" class="form-label">Update Interval (ms)</label>
                                    <input type="number" class="form-control" id="updateInterval" name="updateInterval" value="60000" min="1000" step="1000" required>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-config">Save Configuration</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Performance Modal -->
    <div class="modal fade" id="performanceModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Performance Analysis</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <ul class="nav nav-tabs" id="performanceTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="summary-tab" data-bs-toggle="tab" data-bs-target="#summary" type="button">Summary</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="profit-tab" data-bs-toggle="tab" data-bs-target="#profit" type="button">Profit Analysis</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="trades-tab" data-bs-toggle="tab" data-bs-target="#trades" type="button">Trade Analysis</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="risk-analysis-tab" data-bs-toggle="tab" data-bs-target="#risk-analysis" type="button">Risk Analysis</button>
                        </li>
                    </ul>
                    <div class="tab-content p-3" id="performanceTabsContent">
                        <div class="tab-pane fade show active" id="summary" role="tabpanel">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Performance Summary</h5>
                                            <table class="table">
                                                <tbody>
                                                    <tr>
                                                        <td>Total Profit</td>
                                                        <td id="total-profit">$0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Profit Percentage</td>
                                                        <td id="profit-percentage">0.00%</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Max Drawdown</td>
                                                        <td id="max-drawdown">0.00%</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Sharpe Ratio</td>
                                                        <td id="sharpe-ratio">0.00</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Trade Statistics</h5>
                                            <table class="table">
                                                <tbody>
                                                    <tr>
                                                        <td>Total Trades</td>
                                                        <td id="total-trades">0</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Win Rate</td>
                                                        <td id="win-rate">0.00%</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Average Profit per Trade</td>
                                                        <td id="avg-profit">$0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Grid Utilization</td>
                                                        <td id="summary-grid-utilization">0.00%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-4">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Cumulative Profit Chart</h5>
                                            <div class="chart-container">
                                                <canvas id="cumulative-profit-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="profit" role="tabpanel">
                            <div class="row">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Profit Distribution by Grid Level</h5>
                                            <div class="chart-container">
                                                <canvas id="profit-heatmap-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-4">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Profit by Time of Day</h5>
                                            <div class="chart-container">
                                                <canvas id="profit-time-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="trades" role="tabpanel">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Trade Frequency by Hour</h5>
                                            <div class="chart-container">
                                                <canvas id="trade-frequency-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Trade Size Distribution</h5>
                                            <div class="chart-container">
                                                <canvas id="trade-size-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-4">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">All Trades</h5>
                                            <div style="max-height: 300px; overflow-y: auto;">
                                                <table class="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Time</th>
                                                            <th>Side</th>
                                                            <th>Price</th>
                                                            <th>Size</th>
                                                            <th>Grid Level</th>
                                                            <th>Profit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="all-trades-body">
                                                        <!-- All trades will be inserted here dynamically -->
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="risk-analysis" role="tabpanel">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Stop Loss Effectiveness</h5>
                                            <table class="table">
                                                <tbody>
                                                    <tr>
                                                        <td>Stop Loss Triggers</td>
                                                        <td id="stop-loss-triggers">0</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Potential Loss Saved</td>
                                                        <td id="potential-loss-saved">$0.00</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Effectiveness Rating</td>
                                                        <td id="stop-loss-effectiveness">0.00%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Risk Exposure Over Time</h5>
                                            <div class="chart-container">
                                                <canvas id="risk-exposure-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="row mt-4">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-body">
                                            <h5 class="card-title">Stop Loss Evolution</h5>
                                            <div class="chart-container">
                                                <canvas id="stop-loss-chart"></canvas>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="export-performance">Export Data</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Logs Modal -->
    <div class="modal fade" id="logsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">System Logs</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="btn-group mb-3" role="group">
                        <button type="button" class="btn btn-sm btn-outline-secondary active" data-log-level="all">All</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-log-level="info">Info</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-log-level="warning">Warning</button>
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-log-level="error">Error</button>
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <pre id="log-container" style="max-height: 500px; overflow-y: auto;"></pre>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="clear-logs">Clear Logs</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/socket.io-client@4.6.1/dist/socket.io.min.js"></script>
    <script src="/js/dashboard.js"></script>
</body>
</html>
`;

export const dashboardJsTemplate = `
// Connect to WebSocket server
const socket = io();

// DOM elements
const startBotButton = document.getElementById('start-bot');
const stopBotButton = document.getElementById('stop-bot');
const saveConfigButton = document.getElementById('save-config');
const connectionStatus = document.getElementById('connection-status');
const unrealizedPnlElement = document.getElementById('unrealized-pnl');
const realizedPnlElement = document.getElementById('realized-pnl');
const currentPriceElement = document.getElementById('current-price');
const gridUtilizationElement = document.getElementById('grid-utilization');
const orderBookBody = document.getElementById('order-book-body');
const tradeHistoryBody = document.getElementById('trade-history-body');
const gridVisualization = document.getElementById('grid-visualization');

// Store current bot state
let botRunning = false;
let currentConfig = null;
let tradingState = null;
let performanceMetrics = null;
let priceHistory = [];
let priceChart = null;

// Initialize charts
function initializeCharts() {
    const priceChartCtx = document.getElementById('price-chart').getContext('2d');
    priceChart = new Chart(priceChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
                data: [],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Price'
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Initialize the dashboard
function initializeDashboard() {
    initializeCharts();
    setupEventListeners();
    checkBotStatus();
}

// Setup event listeners
function setupEventListeners() {
    // Start bot button
    startBotButton.addEventListener('click', startBot);
    
    // Stop bot button
    stopBotButton.addEventListener('click', stopBot);
    
    // Save config button
    saveConfigButton.addEventListener('click', saveConfig);
    
    // Auto range toggle
    const autoRangeToggle = document.getElementById('autoRange');
    const manualRangeDiv = document.getElementById('manual-range');
    
    autoRangeToggle.addEventListener('change', function() {
        manualRangeDiv.style.display = this.checked ? 'none' : 'block';
    });
    
    // Leverage warning
    const leverageInput = document.getElementById('leverage');
    const leverageWarning = document.getElementById('leverage-warning');
    
    leverageInput.addEventListener('input', function() {
        leverageWarning.style.display = parseInt(this.value) > 5 ? 'block' : 'none';
    });
    
    // Grid adjustment trigger
    const gridAdjustmentTrigger = document.getElementById('gridAdjustmentTrigger');
    
    gridAdjustmentTrigger.addEventListener('change', function() {
        const triggerParams = document.querySelectorAll('.trigger-param');
        triggerParams.forEach(param => {
            param.style.display = 'none';
        });
        
        const selectedParam = document.querySelector(`.trigger-param.${this.value}`);
        if (selectedParam) {
            selectedParam.style.display = 'block';
        }
    });
    
    // Chart timeframe buttons
    const timeframeButtons = document.querySelectorAll('[data-timeframe]');
    timeframeButtons.forEach(button => {
        button.addEventListener('click', function() {
            timeframeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updatePriceChart(this.dataset.timeframe);
        });
    });
    
    // Socket.io event listeners
    socket.on('connect', () => {
        connectionStatus.innerHTML = '<span class="badge bg-success">Connected</span>';
    });
    
    socket.on('disconnect', () => {
        connectionStatus.innerHTML = '<span class="badge bg-danger">Disconnected</span>';
    });
    
    socket.on('tradingState', (state) => {
        tradingState = state;
        updateTradingStateUI();
    });
    
    socket.on('metrics', (metrics) => {
        performanceMetrics = metrics;
        updateMetricsUI();
    });
    
    socket.on('trades', (trades) => {
        updateTradeHistoryUI(trades);
    });
}

// Check if bot is running
function checkBotStatus() {
    fetch('/bot/status')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'running') {
                botRunning = true;
                startBotButton.disabled = true;
                stopBotButton.disabled = false;
                tradingState = data.tradingState;
                performanceMetrics = data.metrics;
                updateTradingStateUI();
                updateMetricsUI();
            } else {
                botRunning = false;
                startBotButton.disabled = false;
                stopBotButton.disabled = true;
            }
        })
        .catch(error => {
            console.error('Error checking bot status:', error);
        });
}

// Start the trading bot
function startBot() {
    // Get configuration from the form
    const config = getConfigFromForm();
    
    // Call API to start bot
    fetch('/bot/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            config: config.tradingConfig,
            exchangeConfig: config.exchangeConfig,
            interval: parseInt(document.getElementById('updateInterval').value)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'started') {
            botRunning = true;
            startBotButton.disabled = true;
            stopBotButton.disabled = false;
            currentConfig = data.config;
            
            // Close the config modal
            const configModal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
            configModal.hide();
            
            // Show success alert
            alert('Trading bot started successfully!');
        } else {
            alert('Failed to start trading bot: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error starting bot:', error);
        alert('Failed to start trading bot. See console for details.');
    });
}

// Stop the trading bot
function stopBot() {
    fetch('/bot/stop', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'stopped') {
            botRunning = false;
            startBotButton.disabled = false;
            stopBotButton.disabled = true;
            
            // Show success alert
            alert('Trading bot stopped successfully!');
        } else {
            alert('Failed to stop trading bot: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error stopping bot:', error);
        alert('Failed to stop trading bot. See console for details.');
    });
}

// Save configuration
function saveConfig() {
    const config = getConfigFromForm();
    
    // Store in localStorage for convenience
    localStorage.setItem('gridbot-config', JSON.stringify(config));
    
    // Close the config modal
    const configModal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
    configModal.hide();
    
    // Show success alert
    alert('Configuration saved successfully!');
}

// Get configuration from form
function getConfigFromForm() {
    // Get investment config
    const investmentConfig = {
        totalInvestment: parseFloat(document.getElementById('totalInvestment').value),
        assetPair: document.getElementById('assetPair').value,
        leverage: parseInt(document.getElementById('leverage').value)
    };
    
    // Get grid config
    const gridConfig = {
        numberOfGrids: parseInt(document.getElementById('numberOfGrids').value),
        autoRange: document.getElementById('autoRange').checked,
        upperBound: parseFloat(document.getElementById('upperBound').value),
        lowerBound: parseFloat(document.getElementById('lowerBound').value),
        distributionMethod: document.getElementById('distributionMethod').value
    };
    
    // Get risk management config
    const riskManagementConfig = {
        basicStopLoss: {
            enabled: document.getElementById('basicStopLossEnabled').checked,
            percentage: parseFloat(document.getElementById('basicStopLossPercentage').value),
            method: document.getElementById('basicStopLossMethod').value
        },
        dynamicStopLoss: {
            enabled: document.getElementById('dynamicStopLossEnabled').checked,
            initialRiskThreshold: parseFloat(document.getElementById('initialRiskThreshold').value),
            expansionFactor: parseFloat(document.getElementById('expansionFactor').value),
            maximumExpansion: parseFloat(document.getElementById('maximumExpansion').value)
        },
        trailingStopLoss: {
            enabled: document.getElementById('trailingStopLossEnabled').checked,
            trailingDistance: parseFloat(document.getElementById('trailingDistance').value),
            activationThreshold: parseFloat(document.getElementById('activationThreshold').value),
            isDiscrete: document.getElementById('isDiscrete').checked
        }
    };
    
    // Get position management config
    const positionManagementConfig = {
        rebalancingEnabled: document.getElementById('rebalancingEnabled').checked,
        driftCorrectionEnabled: document.getElementById('driftCorrectionEnabled').checked,
        gridAdjustment: {
            enabled: document.getElementById('gridAdjustmentEnabled').checked,
            trigger: document.getElementById('gridAdjustmentTrigger').value,
            timeInterval: parseInt(document.getElementById('timeInterval').value) * 60 * 1000, // Convert minutes to ms
            volatilityThreshold: parseFloat(document.getElementById('volatilityThreshold').value),
            profitThreshold: parseFloat(document.getElementById('profitThreshold').value)
        }
    };
    
    // Get exchange config
    const exchangeConfig = {
        name: document.getElementById('exchangeName').value,
        apiKey: document.getElementById('apiKey').value,
        apiSecret: document.getElementById('apiSecret').value,
        additionalParams: {
            assetPair: document.getElementById('assetPair').value
        }
    };
    
    return {
        tradingConfig: {
            investment: investmentConfig,
            grid: gridConfig,
            riskManagement: riskManagementConfig,
            positionManagement: positionManagementConfig
        },
        exchangeConfig: exchangeConfig
    };
}

// Update trading state UI
function updateTradingStateUI() {
    if (!tradingState) return;
    
    // Update current price
    currentPriceElement.textContent = formatCurrency(tradingState.currentPrice);
    
    // Update PnL
    unrealizedPnlElement.textContent = formatCurrency(tradingState.unrealizedPnL);
    realizedPnlElement.textContent = formatCurrency(tradingState.realizedPnL);
    
    // Add price to history
    priceHistory.push({
        x: new Date(),
        y: tradingState.currentPrice
    });
    
    // Update price chart
    updatePriceChart('all');
    
    // Update order book
    updateOrderBookUI();
    
    // Update grid visualization
    updateGridVisualizationUI();
}

// Update metrics UI
function updateMetricsUI() {
    if (!performanceMetrics) return;
    
    // Update grid utilization
    gridUtilizationElement.textContent = performanceMetrics.gridUtilizationPercentage.toFixed(2) + '%';
    
    // Update performance summary if modal is open
    if (document.getElementById('performanceModal').classList.contains('show')) {
        updatePerformanceSummaryUI();
    }
}

// Update order book UI
function updateOrderBookUI() {
    if (!tradingState || !tradingState.activeOrders) return;
    
    // Clear existing rows
    orderBookBody.innerHTML = '';
    
    // Add active orders
    tradingState.activeOrders.forEach(order => {
        const row = document.createElement('tr');
        row.className = order.side === 'buy' ? 'table-success' : 'table-danger';
        
        row.innerHTML = \`
            <td>\${order.side.toUpperCase()}</td>
            <td>\${formatCurrency(order.price)}</td>
            <td>\${order.size.toFixed(8)}</td>
            <td>\${order.status}</td>
        \`;
        
        orderBookBody.appendChild(row);
    });
}

// Update trade history UI
function updateTradeHistoryUI(newTrades) {
    if (!newTrades || newTrades.length === 0) return;
    
    // Add new trades to the trade history
    newTrades.forEach(trade => {
        const row = document.createElement('tr');
        row.className = trade.side === 'buy' ? 'table-success' : 'table-danger';
        
        row.innerHTML = \`
            <td>\${formatTime(trade.timestamp)}</td>
            <td>\${trade.side.toUpperCase()}</td>
            <td>\${formatCurrency(trade.price)}</td>
            <td>\${formatCurrency(trade.profit)}</td>
        \`;
        
        tradeHistoryBody.prepend(row);
        
        // Limit the number of displayed trades
        if (tradeHistoryBody.children.length > 100) {
            tradeHistoryBody.removeChild(tradeHistoryBody.lastChild);
        }
    });
    
    // Update all trades table if performance modal is open
    if (document.getElementById('performanceModal').classList.contains('show')) {
        updateAllTradesUI(newTrades);
    }
}

// Update grid visualization UI
function updateGridVisualizationUI() {
    if (!tradingState || !tradingState.gridLevels) return;
    
    // Clear existing grid visualization
    gridVisualization.innerHTML = '';
    
    // Get price range
    const gridLevels = tradingState.gridLevels;
    const minPrice = Math.min(...gridLevels.map(level => level.price));
    const maxPrice = Math.max(...gridLevels.map(level => level.price));
    const range = maxPrice - minPrice;
    
    // Create grid levels
    gridLevels.forEach(level => {
        // Calculate position percentage
        const positionPercent = ((level.price - minPrice) / range) * 100;
        
        // Create grid level element
        const gridLevelElement = document.createElement('div');
        gridLevelElement.className = 'grid-level';
        
        // Add buy/sell class if level has an order
        if (level.buyOrder) {
            gridLevelElement.classList.add('grid-buy');
        } else if (level.sellOrder) {
            gridLevelElement.classList.add('grid-sell');
        }
        
        // Add current price indicator
        if (Math.abs(level.price - tradingState.currentPrice) < 0.01) {
            gridLevelElement.classList.add('grid-current-price');
        }
        
        // Position the grid level
        gridLevelElement.style.bottom = positionPercent + '%';
        
        // Add price label
        const priceLabel = document.createElement('div');
        priceLabel.className = 'price-label';
        priceLabel.textContent = formatCurrency(level.price);
        
        // Add elements to the grid visualization
        gridLevelElement.appendChild(priceLabel);
        gridVisualization.appendChild(gridLevelElement);
    });
}

// Update price chart
function updatePriceChart(timeframe) {
    if (priceHistory.length === 0) return;
    
    let filteredHistory = [...priceHistory];
    
    // Filter data based on selected timeframe
    if (timeframe !== 'all') {
        const now = new Date();
        let cutoff;
        
        switch (timeframe) {
            case '1h':
                cutoff = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '4h':
                cutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000);
                break;
            case '1d':
                cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
        }
        
        filteredHistory = filteredHistory.filter(point => point.x >= cutoff);
    }
    
    // Update chart data
    priceChart.data.labels = filteredHistory.map(point => point.x);
    priceChart.data.datasets[0].data = filteredHistory.map(point => point.y);
    
    // Update chart
    priceChart.update();
}

// Update performance summary UI
function updatePerformanceSummaryUI() {
    fetch('/analysis/trades')
        .then(response => response.json())
        .then(data => {
            // Update heatmap and frequency distribution charts
            // (Implementation depends on your chart library)
        })
        .catch(error => {
            console.error('Error fetching trade analysis:', error);
        });
    
    fetch('/metrics')
        .then(response => response.json())
        .then(data => {
            const summary = data.summary;
            
            // Update summary metrics
            document.getElementById('total-profit').textContent = formatCurrency(summary.totalProfit);
            document.getElementById('profit-percentage').textContent = summary.profitPercentage.toFixed(2) + '%';
            document.getElementById('max-drawdown').textContent = summary.maxDrawdown.toFixed(2) + '%';
            document.getElementById('sharpe-ratio').textContent = summary.sharpeRatio.toFixed(2);
            document.getElementById('total-trades').textContent = summary.tradeCount;
            document.getElementById('win-rate').textContent = summary.winRate.toFixed(2) + '%';
            document.getElementById('avg-profit').textContent = formatCurrency(summary.averageTradeProfit);
            document.getElementById('summary-grid-utilization').textContent = performanceMetrics.gridUtilizationPercentage.toFixed(2) + '%';
        })
        .catch(error => {
            console.error('Error fetching metrics:', error);
        });
    
    fetch('/analysis/stoploss')
        .then(response => response.json())
        .then(data => {
            // Update stop loss metrics
            document.getElementById('stop-loss-triggers').textContent = data.effectiveness.triggeredCount;
            document.getElementById('potential-loss-saved').textContent = formatCurrency(data.effectiveness.savedLoss);
            document.getElementById('stop-loss-effectiveness').textContent = data.effectiveness.effectiveness.toFixed(2) + '%';
            
            // Update stop loss chart
            // (Implementation depends on your chart library)
        })
        .catch(error => {
            console.error('Error fetching stop loss analysis:', error);
        });
}

// Update all trades UI
function updateAllTradesUI(newTrades = []) {
    // Fetch all trades if not provided
    if (newTrades.length === 0) {
        fetch('/trades')
            .then(response => response.json())
            .then(data => {
                populateAllTradesTable(data.trades);
            })
            .catch(error => {
                console.error('Error fetching trades:', error);
            });
    } else {
        // Just add new trades to the existing table
        const allTradesBody = document.getElementById('all-trades-body');
        
        newTrades.forEach(trade => {
            const row = document.createElement('tr');
            row.className = trade.side === 'buy' ? 'table-success' : 'table-danger';
            
            row.innerHTML = \`
                <td>\${formatTime(trade.timestamp)}</td>
                <td>\${trade.side.toUpperCase()}</td>
                <td>\${formatCurrency(trade.price)}</td>
                <td>\${trade.size.toFixed(8)}</td>
                <td>\${trade.gridLevel}</td>
                <td>\${formatCurrency(trade.profit)}</td>
            \`;
            
            allTradesBody.prepend(row);
        });
    }
}

// Populate all trades table
function populateAllTradesTable(trades) {
    const allTradesBody = document.getElementById('all-trades-body');
    allTradesBody.innerHTML = '';
    
    trades.forEach(trade => {
        const row = document.createElement('tr');
        row.className = trade.side === 'buy' ? 'table-success' : 'table-danger';
        
        row.innerHTML = \`
            <td>\${formatTime(trade.timestamp)}</td>
            <td>\${trade.side.toUpperCase()}</td>
            <td>\${formatCurrency(trade.price)}</td>
            <td>\${trade.size.toFixed(8)}</td>
            <td>\${trade.gridLevel}</td>
            <td>\${formatCurrency(trade.profit)}</td>
        \`;
        
        allTradesBody.appendChild(row);
    });
}

// Format currency
function formatCurrency(value) {
    return '$' + parseFloat(value).toFixed(2);
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', initializeDashboard);
`;
