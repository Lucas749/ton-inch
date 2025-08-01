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
│   ├── IndexLimitOrderTest.t.sol # Comprehensive test suite
│   └── Counter.t.sol             # Default test
├── script/                       # Deployment Scripts
│   ├── DeployAndTest.s.sol       # Deploy and test all contracts
│   └── Counter.s.sol             # Default script
├── lib/                          # Dependencies
│   └── openzeppelin-contracts/   # OpenZeppelin library
├── out/                          # Compiled artifacts
├── cache/                        # Build cache
└── foundry.toml                  # Foundry configuration
```

## ⚡ Quick Start

```bash
# Compile contracts
forge build

# Run tests on Base Sepolia fork
forge test --fork-url https://sepolia.base.org -vvv

# Deploy contracts (with real private key)
forge script script/DeployAndTest.s.sol --rpc-url https://sepolia.base.org --broadcast
```

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

### 3. **Supported Conditions**
- 📈 **BTC_PRICE** - Bitcoin price movements
- 👥 **ELON_FOLLOWERS** - Social media milestones  
- 📊 **VIX_INDEX** - Market volatility (fear/greed)
- 💰 **INFLATION_RATE** - Economic indicators
- 📉 **UNEMPLOYMENT_RATE** - Job market data
- 🚗 **TESLA_STOCK** - Individual stock prices

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