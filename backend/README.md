# Index-Based Trading with 1inch Integration

A complete system for creating conditional limit orders based on real-world index data (VIX, BTC price, inflation, etc.) using 1inch protocol on Base mainnet.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp env.example .env
# Edit .env with your PRIVATE_KEY and ONEINCH_API_KEY

# Test the system
node simple-oracle-demo.js        # View all index data
node test-order-manager.js         # Test order retrieval
node test-index-order-creator.js   # Test order creation
```

## 📁 File Structure

### 🏗️ Core System Files

| File | Purpose | Usage |
|------|---------|-------|
| `src/oracle-manager.js` | **Mock Oracle Interface** - Query & update mock index data | `const result = await getAllIndices()` |
| `src/chainlink-oracle-manager.js` | **Chainlink Oracle Interface** - Decentralized real-world data via Chainlink Functions | `const result = await getAllChainlinkIndices()` |
| `src/order-manager.js` | **Order Retrieval** - Get active/historical orders | `const orders = await getAllActiveOrdersForMaker(address, apiKey)` |
| `src/index-order-creator.js` | **Order Creation** - Create conditional limit orders | `const order = await createIndexBasedOrder({...})` |
| `src/order-cancellation.js` | **Order Cancellation** - Cancel limit orders by hash | `const result = await cancelLimitOrder(hash, privateKey, apiKey)` |
| `src/config.ts` | **Configuration** - Network settings, tokens, contracts | Imported by other files |

### 🧪 Test & Demo Files

| File | Purpose | What it shows |
|------|---------|---------------|
| `simple-oracle-demo.js` | **Quick Oracle View** | Current values of all 7 indices |
| `test-oracle-manager.js` | **Complete Oracle Testing** | Full test suite: read all indices, create custom index, update values, simulate price movements, manage status |
| `test-chainlink-oracle.js` | **Chainlink Functions Testing** | Test Chainlink Functions integration, real-world data fetching, decentralized oracle management |
| `test-hybrid-oracle.js` | **Hybrid Oracle Testing** | Test switching between mock and Chainlink oracles, oracle type management, seamless integration |
| `test-order-manager.js` | **Order Testing** | Retrieve your active & historical orders |
| `test-index-order-creator.js` | **Order Creation Testing** | Create conditional orders with different indices |
| `test-order-cancellation.js` | **Order Cancellation Testing** | Test order cancellation functionality, check cancellable orders, batch cancellation |

### 🔧 Smart Contracts

| File | Purpose | Deployed Address |
|------|---------|------------------|
| `contracts/MockIndexOracle.sol` | **Hybrid Index Oracle** | `0x8a585F9B2359Ef093E8a2f5432F387960e953BD2` |
| `contracts/ChainlinkIndexOracle.sol` | **Chainlink Functions Oracle** | *Deploy with script* |

## 📊 Available Indices

| ID | Index | Current Value | Example Condition |
|----|-------|---------------|-------------------|
| 0 | Inflation Rate | 3.20% | `"Execute when inflation > 4%"` |
| 1 | Elon Followers | 150.0M | `"Execute when Elon > 160M followers"` |
| 2 | BTC Price | $43,000 | `"Execute when BTC < $40,000"` |
| 3 | VIX Index | 22.57 | `"Execute when VIX > 25"` |
| 4 | Unemployment | 3.70% | `"Execute when unemployment > 4%"` |
| 5 | Tesla Stock | $248.00 | `"Execute when Tesla > $250"` |
| 6+ | Custom Indices | User-defined | Any custom data source |

## 🎯 How to Use

### 1. View Index Data

**Quick View (Read-Only):**
```bash
node simple-oracle-demo.js
```
Shows current values of all indices available for trading conditions.

**Complete Test Suite (Read + Write):**
```bash
node test-oracle-manager.js
```
Comprehensive test that also creates/updates indices, simulates price movements, and manages index status. Requires private key for write operations.

### 2. Create Conditional Order
```javascript
const { createIndexBasedOrder } = require('./src/index-order-creator');

const order = await createIndexBasedOrder({
    fromToken: 'USDC',      // Trade from USDC
    toToken: 'WETH',        // Trade to WETH  
    amount: '0.1',          // Amount: 0.1 USDC
    indexId: 3,             // VIX Index
    operator: 'gt',         // Greater than
    threshold: 2500,        // 25.00 (scaled)
    apiKey: process.env.ONEINCH_API_KEY,
    privateKey: process.env.PRIVATE_KEY
});

// Result: Order executes when VIX > 25
```

### 3. Check Your Orders
```javascript
const { getAllActiveOrdersForMaker } = require('./src/order-manager');

const orders = await getAllActiveOrdersForMaker(
    '0xYourAddress', 
    process.env.ONEINCH_API_KEY
);

console.log(`You have ${orders.activeOrders.length} active orders`);
```

### 4. Cancel Orders
```javascript
const { cancelLimitOrder } = require('./src/order-cancellation');

// Cancel single order
const result = await cancelLimitOrder(
    '0x1234567890abcdef...',         // Order hash
    process.env.PRIVATE_KEY,         // Your private key  
    process.env.ONEINCH_API_KEY      // API key
);

if (result.success) {
    console.log(`✅ Order cancelled: ${result.transactionHash}`);
} else {
    console.log(`❌ Cancellation failed: ${result.error}`);
}

// Check if order can be cancelled first
const canCancel = await canCancelOrder(
    orderHash, 
    walletAddress, 
    apiKey
);

if (canCancel.canCancel) {
    // Proceed with cancellation
} else {
    console.log(`Cannot cancel: ${canCancel.reason}`);
}
```

### 5. CLI Order Cancellation
```bash
# Cancel specific order by hash
node src/order-cancellation.js 0x1234567890abcdef...

# Test cancellation functionality
node test-order-cancellation.js
```

### 6. Manage Oracle Data
```javascript
const oracleManager = require('./src/oracle-manager');

// View all indices
const indices = await oracleManager.getAllIndices();

// Create custom index
const newIndex = await oracleManager.createNewIndex(
    42000,                                    // Initial value
    'https://api.example.com/custom-data',    // Data source
    process.env.PRIVATE_KEY                   // Your private key
);

// Update index value
await oracleManager.updateIndexValue(3, 2800, privateKey); // VIX to 28.00
```

## ⚙️ Configuration

### Environment Variables (.env)
```bash
PRIVATE_KEY=0xYourPrivateKey                    # Your wallet private key
ONEINCH_API_KEY=YourAPIKey                      # 1inch API key
CHAIN_ID=8453                                   # Base mainnet
RPC_URL=https://base.llamarpc.com               # Base RPC
INDEX_ORACLE_ADDRESS=0x8a585F9B2359Ef093E8a2f5432F387960e953BD2         # Oracle contract
```

### Supported Tokens (Base Mainnet)
```javascript
USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
WETH: '0x4200000000000000000000000000000000000006'
```

## 🔄 Common Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `gt` | Greater than | VIX > 25 |
| `lt` | Less than | BTC < $40,000 |
| `gte` | Greater than or equal | Inflation >= 4% |
| `lte` | Less than or equal | Tesla <= $200 |
| `eq` | Equal to | Custom index = 1000 |

## 📈 Frontend Integration

### React Hook Example
```javascript
import { useState, useEffect } from 'react';
import * as oracleManager from './oracle-manager';

const useIndexData = () => {
  const [indices, setIndices] = useState([]);
  
  useEffect(() => {
    const loadData = async () => {
      const result = await oracleManager.getAllIndices();
      if (result.success) setIndices(result.indices);
    };
    loadData();
  }, []);
  
  return indices;
};
```

### API Endpoint Example
```javascript
const express = require('express');
const { createIndexBasedOrder } = require('./src/index-order-creator');
const { cancelLimitOrder } = require('./src/order-cancellation');

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const order = await createIndexBasedOrder(req.body);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel order
app.delete('/api/orders/:orderHash', async (req, res) => {
  try {
    const { orderHash } = req.params;
    const { privateKey } = req.body;
    const result = await cancelLimitOrder(
      orderHash, 
      privateKey, 
      process.env.ONEINCH_API_KEY
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🛠️ Development

### Run Tests
```bash
node test-oracle-manager.js      # Complete oracle test suite (see below)
node test-hybrid-oracle.js       # Test hybrid oracle switching (mock ↔ chainlink)
node test-chainlink-oracle.js    # Test Chainlink Functions integration
node test-order-manager.js       # Test order retrieval  
node test-index-order-creator.js # Test order creation
node test-order-cancellation.js  # Test order cancellation
```

#### 🧪 What `test-oracle-manager.js` Tests

This comprehensive test demonstrates **all oracle functionality**:

**📋 Read Operations:**
- ✅ Oracle status check (owner, next custom ID)
- ✅ Get all 6 predefined indices with current values
- ✅ Get all custom indices (user-created) 
- ✅ Get combined view of all indices
- ✅ Get specific index by ID (VIX example)

**✍️ Write Operations** (requires private key):
- 🆕 **Create custom index** - Creates index with value 42,000
- 📝 **Update custom index** - Updates created index to 50,000  
- 📈 **Simulate price movement** - Increases VIX by 5%
- ⚙️ **Manage index status** - Deactivates then reactivates Tesla stock

**🎯 Expected Results:**
```bash
✅ Oracle operational at 0x8a585F9B2359Ef093E8a2f5432F387960e953BD2
✅ Found 6 predefined indices
✅ Created custom index 6 with transaction hash
✅ Updated index 6 to 50000  
✅ Simulated +5% movement on VIX (21.50 → 22.57)
✅ Deactivated Tesla Stock index
✅ Reactivated Tesla Stock index
📊 FINAL SUMMARY: Total Indices: 7 (6 predefined + 1 custom)
```

### Deploy Oracles
```bash
# Deploy Mock Oracle (for testing)
./deploy-oracle.sh

# Deploy Chainlink Functions Oracle (for production)
forge script script/DeployChainlinkOracle.s.sol --rpc-url $RPC_URL --broadcast --verify
```

## 🔄 Hybrid Oracle System

### 🌟 **Seamless Oracle Switching**

The system now features a **Hybrid Oracle** that can seamlessly switch between mock data and real-world Chainlink Functions on a **per-index basis**:

**🔥 Key Features:**
- ✅ **Per-index oracle selection** - Each index can use Mock or Chainlink
- ✅ **Zero frontend changes** - Same interface for both oracle types
- ✅ **Automatic fallback** - Falls back to mock data if Chainlink fails
- ✅ **Gradual migration** - Switch indices to Chainlink one by one
- ✅ **Production flexibility** - Use mock for testing, Chainlink for production

### 🚀 **Quick Start with Hybrid Oracle**

1. **Deploy the Updated Oracle:**
```bash
# Deploy hybrid oracle (updated MockIndexOracle)
./deploy-hybrid-oracle.sh
```

2. **Set Chainlink Oracle Address:**
```bash
# After deploying ChainlinkIndexOracle
export CHAINLINK_ORACLE_ADDRESS=0x...

# Connect the oracles
node -e "const oracle = require('./src/oracle-manager'); oracle.setChainlinkOracleAddress('$CHAINLINK_ORACLE_ADDRESS', process.env.PRIVATE_KEY)"
```

3. **Switch Indices to Chainlink:**
```bash
# Switch VIX index to Chainlink Functions
node -e "const oracle = require('./src/oracle-manager'); oracle.setIndexOracleType(3, 1, process.env.PRIVATE_KEY)"

# Switch multiple indices at once
node -e "const oracle = require('./src/oracle-manager'); oracle.batchSetOracleTypes([0,2,3], [1,1,1], process.env.PRIVATE_KEY)"
```

4. **Test the Hybrid System:**
```bash
# Run comprehensive hybrid oracle test
node test-hybrid-oracle.js

# Check hybrid status
node -e "const oracle = require('./src/oracle-manager'); oracle.getHybridOracleStatus().then(console.log)"
```

### 🔧 **Oracle Type Management**

```javascript
const oracleManager = require('./src/oracle-manager');

// Oracle types
const ORACLE_TYPES = {
    MOCK: 0,        // Use local mock data
    CHAINLINK: 1    // Use Chainlink Functions
};

// Set individual index oracle type
await oracleManager.setIndexOracleType(
    3,                              // VIX Index
    ORACLE_TYPES.CHAINLINK,         // Switch to Chainlink
    privateKey
);

// Create new index with specific oracle type
await oracleManager.createNewIndexWithOracleType(
    'Gold Price',                   // Name
    200000,                         // Initial value
    'https://api.metals.live/gold', // Source URL
    ORACLE_TYPES.CHAINLINK,         // Use Chainlink
    privateKey
);

// Check which oracle an index is using
const oracleType = await oracleManager.getIndexOracleType(3);
console.log('VIX Oracle Type:', oracleType.oracleTypeName);

// Get hybrid oracle status
const status = await oracleManager.getHybridOracleStatus();
console.log('Mock Indices:', status.mockIndicesCount);
console.log('Chainlink Indices:', status.chainlinkIndicesCount);
```

### 💡 **How It Works**

**Frontend Code (No Changes Needed):**
```javascript
// This automatically uses the correct oracle based on index configuration
const indexValue = await oracleContract.getIndexValue(3); // VIX

// Returns Chainlink data if index is set to CHAINLINK
// Returns mock data if index is set to MOCK
// Falls back to mock data if Chainlink fails
```

**Smart Contract Logic:**
```solidity
function getIndexValue(uint256 indexId) external view returns (uint256, uint256) {
    IndexData memory data = indexData[indexType];
    
    // Route to appropriate oracle
    if (data.oracleType == OracleType.CHAINLINK && chainlinkOracleAddress != address(0)) {
        return _getChainlinkValue(indexId);  // Get from Chainlink
    } else {
        return (data.value, data.timestamp); // Get from mock
    }
}
```

## 🔗 Chainlink Functions Integration

### 🌐 **Decentralized Real-World Data**

The system now supports **Chainlink Functions** for truly decentralized data feeds:

**🔥 Key Features:**
- ✅ **Real-world data** - BTC prices, VIX index, inflation rates, stock prices
- ✅ **Decentralized** - No single point of failure
- ✅ **Customizable** - Add any REST API as a data source
- ✅ **Production ready** - Built on Chainlink's proven infrastructure

### 📝 **Source Code Templates**

Pre-built JavaScript templates for common data sources:

```bash
chainlink-functions/
├── vix-source.js           # VIX volatility index
├── btc-price-source.js     # Bitcoin price from CoinGecko
├── stock-price-source.js   # Stock prices (requires API key)
├── inflation-source.js     # US inflation rate
└── generic-api-source.js   # Template for any REST API
```

### 🚀 **Quick Start with Chainlink Functions**

1. **Deploy the Chainlink Oracle:**
```bash
# Set your Chainlink Functions subscription ID
export CHAINLINK_SUBSCRIPTION_ID=123

# Deploy the contract
forge script script/DeployChainlinkOracle.s.sol --rpc-url $RPC_URL --broadcast
```

2. **Test the Integration:**
```bash
# Set the deployed contract address
export CHAINLINK_ORACLE_ADDRESS=0x...

# Run the test suite
node test-chainlink-oracle.js
```

3. **Create Custom Data Sources:**
```javascript
const chainlinkManager = require('./src/chainlink-oracle-manager');

// Create a new index with custom API
await chainlinkManager.createChainlinkIndex(
    'GENERIC',                           // Template
    'https://api.example.com/data',      // Source URL
    'Custom Economic Indicator',         // Description
    privateKey
);
```

### 🔧 **Chainlink Functions Usage**

```javascript
// Get all Chainlink-powered indices
const indices = await chainlinkManager.getAllChainlinkIndices();

// Update an index with real-world data
await chainlinkManager.updateChainlinkIndex(
    0,              // Index ID
    'VIX',          // Template name
    [],             // Arguments
    privateKey
);

// Use in trading orders
const order = await createIndexBasedOrder({
    fromToken: 'USDC',
    toToken: 'WETH',
    amount: '0.1',
    indexId: 0,           // Chainlink VIX index
    operator: 'gt',
    threshold: 2500,      // VIX > 25.00
    oracleType: 'chainlink'
});
```

### ⚙️ **Chainlink Functions Setup**

1. **Create Subscription:** Visit [functions.chain.link](https://functions.chain.link)
2. **Fund with LINK:** Add LINK tokens to your subscription
3. **Add Consumer:** Add your deployed contract as a consumer
4. **Configure:** Update environment variables:

```bash
CHAINLINK_ORACLE_ADDRESS=0x...     # Your deployed contract
CHAINLINK_SUBSCRIPTION_ID=123      # Your subscription ID
```

## 📋 System Flow

1. **Hybrid Oracle** provides real-time index data (VIX, BTC, etc.)
   - **Per-index selection:** Each index can use Mock or Chainlink oracle
   - **Mock Oracle:** For testing with simulated data
   - **Chainlink Functions:** For production with real decentralized data
   - **Automatic routing:** Frontend code automatically uses the correct oracle
   - **Fallback protection:** Falls back to mock data if Chainlink fails
2. **Order Creator** builds 1inch limit orders with index conditions
3. **1inch Protocol** executes orders when conditions are met
4. **Order Manager** tracks and retrieves order status
5. **Order Cancellation** allows users to cancel orders before execution

## ⚠️ Safety Notes

- All examples use tiny amounts (0.1 USDC) for safety on mainnet
- Test thoroughly before using larger amounts
- Monitor gas costs on Base mainnet
- Keep private keys secure

## 🔗 Links

- **1inch API**: https://docs.1inch.io/
- **Base Network**: https://base.org/
- **Chainlink Functions**: https://docs.chain.link/chainlink-functions
- **Mock Oracle Contract**: `0x8a585F9B2359Ef093E8a2f5432F387960e953BD2`
- **Chainlink Functions Console**: https://functions.chain.link/

---

**Ready to trade based on real-world conditions!** 🎯