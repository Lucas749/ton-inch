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
| `src/oracle-manager.js` | **Oracle Interface** - Query & update index data | `const result = await getAllIndices()` |
| `src/order-manager.js` | **Order Retrieval** - Get active/historical orders | `const orders = await getAllActiveOrdersForMaker(address, apiKey)` |
| `src/index-order-creator.js` | **Order Creation** - Create conditional limit orders | `const order = await createIndexBasedOrder({...})` |
| `src/config.ts` | **Configuration** - Network settings, tokens, contracts | Imported by other files |

### 🧪 Test & Demo Files

| File | Purpose | What it shows |
|------|---------|---------------|
| `simple-oracle-demo.js` | **Quick Oracle View** | Current values of all 7 indices |
| `test-oracle-manager.js` | **Complete Oracle Testing** | Full test suite: read all indices, create custom index, update values, simulate price movements, manage status |
| `test-order-manager.js` | **Order Testing** | Retrieve your active & historical orders |
| `test-index-order-creator.js` | **Order Creation Testing** | Create conditional orders with different indices |

### 🔧 Smart Contracts

| File | Purpose | Deployed Address |
|------|---------|------------------|
| `contracts/MockIndexOracle.sol` | **Index Data Contract** | `0x55aAfa1D3de3D05536C96Ee9F1b965D6cE04a4c1` |

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

### 4. Manage Oracle Data
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
INDEX_ORACLE_ADDRESS=0x55aAfa1D3de3D...         # Oracle contract
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

app.post('/api/orders', async (req, res) => {
  try {
    const order = await createIndexBasedOrder(req.body);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🛠️ Development

### Run Tests
```bash
node test-oracle-manager.js      # Complete oracle test suite (see below)
node test-order-manager.js       # Test order retrieval  
node test-index-order-creator.js # Test order creation
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
✅ Oracle operational at 0x55aAfa1D3de3D05536C96Ee9F1b965D6cE04a4c1
✅ Found 6 predefined indices
✅ Created custom index 6 with transaction hash
✅ Updated index 6 to 50000  
✅ Simulated +5% movement on VIX (21.50 → 22.57)
✅ Deactivated Tesla Stock index
✅ Reactivated Tesla Stock index
📊 FINAL SUMMARY: Total Indices: 7 (6 predefined + 1 custom)
```

### Deploy New Oracle (if needed)
```bash
./deploy-oracle.sh              # Deploy MockIndexOracle contract
```

## 📋 System Flow

1. **Oracle** provides real-time index data (VIX, BTC, etc.)
2. **Order Creator** builds 1inch limit orders with index conditions
3. **1inch Protocol** executes orders when conditions are met
4. **Order Manager** tracks and retrieves order status

## ⚠️ Safety Notes

- All examples use tiny amounts (0.1 USDC) for safety on mainnet
- Test thoroughly before using larger amounts
- Monitor gas costs on Base mainnet
- Keep private keys secure

## 🔗 Links

- **1inch API**: https://docs.1inch.io/
- **Base Network**: https://base.org/
- **Oracle Contract**: `0x55aAfa1D3de3D05536C96Ee9F1b965D6cE04a4c1`

---

**Ready to trade based on real-world conditions!** 🎯