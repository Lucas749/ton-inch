#!/usr/bin/env node

/**
 * 🚀 Backend API Server for Index-Based Trading System
 * 
 * This server provides REST API endpoints for the frontend to interact with:
 * - Index management (create, update, query)
 * - Order management (place, monitor, execute)
 * - 1inch swap integration
 * - Alpha Vantage market data
 * - Real-time data streaming
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Import our blockchain workflows
const ComprehensiveDemo = require('./comprehensive_demo');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize blockchain connection
let blockchainService;

async function initializeBlockchain() {
    try {
        blockchainService = new ComprehensiveDemo();
        console.log('✅ Blockchain service initialized');
        console.log('👛 Wallet address:', blockchainService.account.address);
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize blockchain service:', error.message);
        return false;
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: {
            blockchain: !!blockchainService,
            wallet: blockchainService?.account?.address || null
        }
    });
});

// ========================================
// INDEX MANAGEMENT ENDPOINTS
// ========================================

// Get all indices
app.get('/api/indices', async (req, res) => {
    try {
        if (!blockchainService) {
            return res.status(500).json({ error: 'Blockchain service not initialized' });
        }

        // Get custom indices from the oracle
        const customIndices = [];
        try {
            // Query custom indices (starting from ID 6 based on demo output)
            for (let i = 6; i <= 25; i++) {
                try {
                    const result = await blockchainService.oracle.methods['getIndexValue(uint256)'](i).call();
                    if (result && result[0]) {
                        customIndices.push({
                            id: i,
                            value: Number(result[0]),
                            timestamp: Number(result[1]),
                            active: true
                        });
                    }
                } catch (e) {
                    // Index doesn't exist, skip
                    break;
                }
            }
        } catch (error) {
            console.error('Error fetching custom indices:', error.message);
        }

        // Get predefined indices
        const predefinedIndices = [
            { id: 'BTC_PRICE', name: 'Bitcoin Price', description: 'BTC price in USD cents' },
            { id: 'TESLA_STOCK', name: 'Tesla Stock', description: 'TSLA stock price in USD cents' },
            { id: 'INFLATION_RATE', name: 'Inflation Rate', description: 'US inflation rate * 100' },
            { id: 'VIX_INDEX', name: 'VIX Index', description: 'Market volatility index * 100' },
            { id: 'UNEMPLOYMENT_RATE', name: 'Unemployment Rate', description: 'US unemployment rate * 100' },
            { id: 'ELON_FOLLOWERS', name: 'Elon Followers', description: 'Elon Musk Twitter followers' }
        ];

        res.json({
            custom: customIndices,
            predefined: predefinedIndices,
            total: customIndices.length + predefinedIndices.length
        });

    } catch (error) {
        console.error('Error fetching indices:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new custom index
app.post('/api/indices', async (req, res) => {
    try {
        if (!blockchainService) {
            return res.status(500).json({ error: 'Blockchain service not initialized' });
        }

        const { name, description, initialValue } = req.body;

        if (!name || !description || !initialValue) {
            return res.status(400).json({ error: 'Missing required fields: name, description, initialValue' });
        }

        // Get next index ID
        const indexId = await blockchainService.oracle.methods.getNextCustomIndexId().call();

        // Create in oracle
        const oracleTx = await blockchainService.sendTransaction(
            blockchainService.oracle.methods.createCustomIndex(initialValue),
            150000
        );
        await blockchainService.waitForTransaction(oracleTx.transactionHash);

        // Register in PreInteraction
        const preIntTx = await blockchainService.sendTransaction(
            blockchainService.preInteraction.methods.registerIndex(
                name, 
                description, 
                blockchainService.oracle.options.address
            ),
            300000
        );
        await blockchainService.waitForTransaction(preIntTx.transactionHash);

        res.json({
            success: true,
            indexId: Number(indexId),
            name,
            description,
            initialValue: Number(initialValue),
            transactionHashes: {
                oracle: oracleTx.transactionHash,
                preInteraction: preIntTx.transactionHash
            }
        });

    } catch (error) {
        console.error('Error creating index:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update index value
app.put('/api/indices/:id', async (req, res) => {
    try {
        if (!blockchainService) {
            return res.status(500).json({ error: 'Blockchain service not initialized' });
        }

        const { id } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({ error: 'Missing required field: value' });
        }

        const tx = await blockchainService.sendTransaction(
            blockchainService.oracle.methods.updateCustomIndex(id, value),
            100000
        );
        await blockchainService.waitForTransaction(tx.transactionHash);

        // Verify update
        const result = await blockchainService.oracle.methods['getIndexValue(uint256)'](id).call();

        res.json({
            success: true,
            indexId: Number(id),
            newValue: Number(result[0]),
            timestamp: Number(result[1]),
            transactionHash: tx.transactionHash
        });

    } catch (error) {
        console.error('Error updating index:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ALPHA VANTAGE INTEGRATION
// ========================================

// Get Alpha Vantage data
app.get('/api/alphavantage/:function', async (req, res) => {
    try {
        const { function: func } = req.params;
        const { symbol, interval, apikey } = req.query;

        const apiKey = apikey || process.env.ALPHAVANTAGE_API_KEY || '123';
        
        const url = `https://www.alphavantage.co/query`;
        const params = {
            function: func,
            symbol,
            interval,
            apikey: apiKey,
            ...req.query
        };

        const response = await axios.get(url, { params });
        
        res.json(response.data);

    } catch (error) {
        console.error('Alpha Vantage API error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// 1INCH SWAP INTEGRATION
// ========================================

// Get 1inch swap quote
app.post('/api/1inch/quote', async (req, res) => {
    try {
        const { src, dst, amount, from } = req.body;
        const apiKey = process.env.ONEINCH_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: '1inch API key not configured' });
        }

        const url = `https://api.1inch.dev/swap/v6.1/8453/quote`;
        const params = { src, dst, amount, from };

        const response = await axios.get(url, {
            params,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('1inch quote error:', error);
        res.status(500).json({ 
            error: error.response?.data || error.message 
        });
    }
});

// Get 1inch swap transaction
app.post('/api/1inch/swap', async (req, res) => {
    try {
        const { src, dst, amount, from, slippage } = req.body;
        const apiKey = process.env.ONEINCH_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: '1inch API key not configured' });
        }

        const url = `https://api.1inch.dev/swap/v6.1/8453/swap`;
        const params = { 
            src, 
            dst, 
            amount, 
            from, 
            slippage: slippage || 1,
            disableEstimate: false,
            allowPartialFill: false
        };

        const response = await axios.get(url, {
            params,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('1inch swap error:', error);
        res.status(500).json({ 
            error: error.response?.data || error.message 
        });
    }
});

// ========================================
// ORDER MANAGEMENT ENDPOINTS
// ========================================

// Get all orders for a user
app.get('/api/orders/:address', async (req, res) => {
    try {
        if (!blockchainService) {
            return res.status(500).json({ error: 'Blockchain service not initialized' });
        }

        const { address } = req.params;
        
        // This would typically query the blockchain for user's orders
        // For now, return mock data structure
        res.json({
            orders: [],
            total: 0,
            active: 0,
            completed: 0
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new conditional order
app.post('/api/orders', async (req, res) => {
    try {
        if (!blockchainService) {
            return res.status(500).json({ error: 'Blockchain service not initialized' });
        }

        const { 
            indexId, 
            operator, 
            threshold, 
            tokenIn, 
            tokenOut, 
            amountIn, 
            minAmountOut 
        } = req.body;

        // Validate required fields
        if (!indexId || operator === undefined || !threshold || !tokenIn || !tokenOut || !amountIn) {
            return res.status(400).json({ 
                error: 'Missing required fields: indexId, operator, threshold, tokenIn, tokenOut, amountIn' 
            });
        }

        // This would create an actual order on the blockchain
        // For now, return success response
        res.json({
            success: true,
            orderId: `order_${Date.now()}`,
            indexId: Number(indexId),
            operator,
            threshold: Number(threshold),
            tokenIn,
            tokenOut,
            amountIn: Number(amountIn),
            minAmountOut: Number(minAmountOut || 0),
            status: 'pending',
            createdAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// REAL-TIME DATA ENDPOINTS
// ========================================

// Get real-time strategy data
app.get('/api/strategies', async (req, res) => {
    try {
        // Mock strategy data that matches the frontend structure
        const strategies = [
            {
                id: "1",
                name: "ETH Whale Watch",
                tokenPair: "ETH/USDC",
                trigger: "Alpha Vantage Data",
                status: "active",
                totalValue: "$50,000",
                currentPrice: "$2,919",
                targetPrice: "$3,100",
                orders: 3,
                filled: 1,
                pnl: "+$2,340",
                icon: "🐋",
                description: "Automatically execute swaps when AAPL stock price crosses above $150",
                createdAt: "2024-01-15",
                lastTriggered: "2 hours ago",
                swapConfig: {
                    mode: "intent",
                    preset: "fast",
                    walletAddress: "0x742d35Cc6639C443695aE2f8a7D5d3bC6f4e2e8a",
                    apiKey: process.env.ONEINCH_API_KEY || "",
                    rpcUrl: "https://sepolia.base.org",
                },
                triggerParams: {
                    dataType: "stocks",
                    symbol: "AAPL",
                    indicator: "price",
                    threshold: "150",
                    condition: "above"
                }
            },
            {
                id: "2",
                name: "BTC Fear & Greed",
                tokenPair: "BTC/USDC",
                trigger: "Alpha Vantage Data",
                status: "active",
                totalValue: "$25,000",
                currentPrice: "$43,500",
                targetPrice: "$45,000",
                orders: 2,
                filled: 0,
                pnl: "+$1,200",
                icon: "😨",
                description: "Execute swaps when Crypto Fear & Greed Index drops below 30",
                createdAt: "2024-01-10",
                lastTriggered: "1 day ago",
                swapConfig: {
                    mode: "classic",
                    preset: "fair",
                    walletAddress: "0x742d35Cc6639C443695aE2f8a7D5d3bC6f4e2e8a",
                    apiKey: process.env.ONEINCH_API_KEY || "",
                    rpcUrl: "https://sepolia.base.org",
                },
                triggerParams: {
                    dataType: "crypto",
                    symbol: "BTC",
                    indicator: "sentiment",
                    threshold: "30",
                    condition: "below"
                }
            }
        ];

        res.json({ strategies, total: strategies.length });

    } catch (error) {
        console.error('Error fetching strategies:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific strategy
app.get('/api/strategies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock strategy data - in production this would query the blockchain
        const strategy = {
            id,
            name: "ETH Whale Watch",
            tokenPair: "ETH/USDC",
            trigger: "Alpha Vantage Data",
            status: "active",
            totalValue: "$50,000",
            currentPrice: "$2,919",
            targetPrice: "$3,100",
            orders: 3,
            filled: 1,
            pnl: "+$2,340",
            icon: "🐋",
            description: "Automatically execute swaps when AAPL stock price crosses above $150",
            createdAt: "2024-01-15",
            lastTriggered: "2 hours ago",
            swapConfig: {
                mode: "intent",
                preset: "fast",
                walletAddress: "0x742d35Cc6639C443695aE2f8a7D5d3bC6f4e2e8a",
                apiKey: process.env.ONEINCH_API_KEY || "",
                rpcUrl: "https://sepolia.base.org",
            },
            triggerParams: {
                dataType: "stocks",
                symbol: "AAPL",
                indicator: "price",
                threshold: "150",
                condition: "above"
            }
        };

        res.json(strategy);

    } catch (error) {
        console.error('Error fetching strategy:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// SERVER STARTUP
// ========================================

async function startServer() {
    console.log('🚀 Starting Backend API Server...');
    
    // Initialize blockchain connection
    const blockchainReady = await initializeBlockchain();
    
    if (!blockchainReady) {
        console.log('⚠️  Starting server without blockchain connection');
        console.log('   Some endpoints may not work properly');
    }

    app.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
        console.log(`📊 API Documentation:`);
        console.log(`   GET  /api/health - Health check`);
        console.log(`   GET  /api/indices - Get all indices`);
        console.log(`   POST /api/indices - Create new index`);
        console.log(`   PUT  /api/indices/:id - Update index value`);
        console.log(`   GET  /api/alphavantage/:function - Alpha Vantage data`);
        console.log(`   POST /api/1inch/quote - Get 1inch quote`);
        console.log(`   POST /api/1inch/swap - Get 1inch swap transaction`);
        console.log(`   GET  /api/strategies - Get all strategies`);
        console.log(`   GET  /api/strategies/:id - Get specific strategy`);
        console.log(`   POST /api/orders - Create conditional order`);
        console.log(`   GET  /api/orders/:address - Get user orders`);
        console.log('\n🎉 Ready to serve the frontend!');
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
});

module.exports = app;