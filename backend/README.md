# 🚀 Index-Based Limit Orders - Smart Contracts

Revolutionary limit orders that execute based on **real-world conditions** using the **1inch Protocol v4**.

## 📁 Project Structure

```
backend/
├── contracts/                    # Smart Contracts
│   ├── IndexPreInteraction.sol   # Validates conditions before order execution
│   ├── IndexLimitOrderFactory.sol # Creates 1inch-compatible orders
│   ├── MockIndexOracle.sol       # Oracle for testing (provides index data)
│   └── interfaces/
│       └── I1inch.sol            # 1inch protocol interfaces
├── test/                         # Foundry Tests
│   └── IndexLimitOrderTest.t.sol # Comprehensive test suite
├── script/                       # Deployment Scripts
│   └── DeployAndTest.s.sol       # Deploy and test all contracts
├── web3_workflow.js              # 🆕 Complete Web3.js workflow
├── WEB3_INTEGRATION_GUIDE.md     # 🆕 Web3.js integration guide
├── GENERALIZATION_GUIDE.md       # 🆕 Custom indices guide
├── SETUP_INSTRUCTIONS.md         # 🆕 Quick setup guide
├── package.json                  # 🆕 Node.js dependencies
├── lib/                          # Dependencies
│   └── openzeppelin-contracts/   # OpenZeppelin library
├── out/                          # Compiled artifacts
├── cache/                        # Build cache
└── foundry.toml                  # Foundry configuration
```

## ⚡ Quick Start

### Option 1: Foundry Testing
```bash
# Compile contracts
forge build

# Run tests on Base Sepolia fork
forge test --fork-url https://sepolia.base.org -vvv

# Deploy contracts (with real private key)
forge script script/DeployAndTest.s.sol --rpc-url https://sepolia.base.org --broadcast
```

### Option 2: Web3.js Integration
```bash
# Install dependencies
npm install

# Deploy contracts
npm run deploy

# Set PRIVATE_KEY in .env file and update contract addresses

# Run complete workflow
npm run workflow
```

📚 **Detailed Integration Guides:**
- 🌐 [`WEB3_INTEGRATION_GUIDE.md`](./WEB3_INTEGRATION_GUIDE.md) - Complete Web3.js examples & workflow
- 🔧 [`GENERALIZATION_GUIDE.md`](./GENERALIZATION_GUIDE.md) - Custom index creation guide  
- ⚡ [`SETUP_INSTRUCTIONS.md`](./SETUP_INSTRUCTIONS.md) - Quick setup steps

## 🎯 How It Works

### 1. **Order Creation**
```solidity
factory.createIndexOrder(
    salt, maker, receiver, makerAsset, takerAsset,
    makingAmount, takingAmount,
    BTC_PRICE,        // Index type
    GREATER_THAN,     // Operator  
    45000 * 100,      // $45k threshold
    expiry
);
```
✅ **Order immediately enters 1inch orderbook**

### 2. **Condition Validation** 
```solidity
// When someone tries to execute the order:
preInteraction.validateOrderCondition(orderHash)
  ↓
// Check: "Is BTC > $45k?"
oracle.getIndexValue(BTC_PRICE) > 45000
  ↓
// ✅ Pass: Order executes
// ❌ Fail: Order stays in book
```

### 3. **Index System (Fully Generalized!)**

**🆕 Users can now register custom indices!**

**Built-in indices:**
- 📈 **BTC_PRICE** (ID: 2) - Bitcoin price movements  
- 👥 **ELON_FOLLOWERS** (ID: 1) - Social media milestones
- 📊 **VIX_INDEX** (ID: 3) - Market volatility (fear/greed)
- 💰 **INFLATION_RATE** (ID: 0) - Economic indicators
- 📉 **UNEMPLOYMENT_RATE** (ID: 4) - Job market data
- 🚗 **TESLA_STOCK** (ID: 5) - Individual stock prices

**Custom indices (unlimited):**
```solidity
// Register any custom index
uint256 myIndexId = preInteraction.registerIndex(
    "APPLE_STOCK",           // Name
    "Apple Inc. stock price", // Description  
    myOracleAddress          // Your oracle
);

// Use in orders
factory.createIndexOrder(..., myIndexId, GREATER_THAN, 150, ...);
```

**Revolutionary possibilities:**
- 🗳️ Election results - Trade when candidate wins
- 🌊 Natural disasters - Hedge on earthquake magnitude  
- 🛰️ Satellite data - Carbon credits on CO2 levels
- 🎵 Music charts - NFT trades when song hits #1
- 🏆 Gaming tournaments - Bet on esports scores
- 📱 App metrics - Trade on app downloads
- 🚀 Space missions - Execute on rocket launch success

## 🧪 Test Results

**✅ 5/8 tests passing on Base Sepolia fork:**
- ✅ Factory order creation (125k gas)
- ✅ Oracle-triggered execution 
- ✅ PreInteraction validation
- ✅ Gas consumption (124k total)
- ✅ Basic oracle functionality

**📊 Performance:**
- **Order Creation**: 106k gas
- **Condition Validation**: 18k gas  
- **Total Flow**: 124k gas (very efficient!)

## 🔗 Real 1inch Integration

Uses **actual 1inch Protocol v4** on Base Sepolia:
- **Contract**: `0xE53136D9De56672e8D2665C98653AC7b8A60Dc44`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Format**: Real 1inch order structure with `preInteraction` callbacks

## 🎯 Innovation

**First-ever limit orders that execute based on real-world events:**
- Traditional: "Buy ETH at $3000" 
- **Our system**: "Buy ETH when BTC > $45k"

Orders sit in the 1inch orderbook and automatically execute when external conditions are met!

## 🚀 Next Steps

1. **Get Base Sepolia ETH**: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
2. **Add private key** to `.env` file  
3. **Deploy to testnet**: `forge script script/DeployAndTest.s.sol --rpc-url https://sepolia.base.org --broadcast`
4. **Create real orders** and watch them execute when conditions are met!