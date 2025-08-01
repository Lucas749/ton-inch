# 🚀 IndexPreInteraction Deployment Guide

Complete step-by-step guide to deploy the world's first generalized conditional trading system to Base Sepolia.

## 📋 Prerequisites

### 1. **Install Foundry**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. **Get Base Sepolia ETH**
You need testnet ETH for gas fees (~0.01 ETH):
- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-sepolia-faucet
- **Superchain Faucet**: https://app.optimism.io/faucet

### 3. **Clone & Setup**
```bash
cd backend
forge install
```

## 🔐 Step 1: Configure Environment

### **Create .env file:**
```bash
cp env.example .env
```

### **Edit .env and add your private key:**
```bash
nano .env
```

**Important: Add `0x` prefix to your private key:**
```env
PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE
```

## ✅ Step 2: Verify Setup

### **Check your wallet address:**
```bash
source .env
cast wallet address --private-key $PRIVATE_KEY
```

### **Check your Base Sepolia balance:**
```bash
cast balance $(cast wallet address --private-key $PRIVATE_KEY) --rpc-url https://sepolia.base.org
```

**You need at least:** `10000000000000000` wei (0.01 ETH)

## 🏗️ Step 3: Compile Contracts

```bash
forge build
```

**Expected output:**
```
[⠒] Compiling...
[⠆] Compiling 4 files with Solc 0.8.23
[⠊] Solc 0.8.23 finished in 2.34s
```

## 🚀 Step 4: Deploy to Base Sepolia

### **Option A: Using Deploy Script (Recommended)**
```bash
source .env && forge script script/DeployOnly.s.sol --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast
```

### **Option B: Using Deployment Helper**
```bash
./deploy.sh
```

## 📋 Step 5: Save Contract Addresses

After successful deployment, you'll see:

```
=== DEPLOYMENT COMPLETE ===
MockIndexOracle:         0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51
IndexPreInteraction:     0xDdA8d73E09ea8ABAB2D9d187e89Ae696F83AA10b
IndexLimitOrderFactory:  0x8b6E93743f7Fb866eC8C2A7043D4Ca876725363d
```

**🔥 LIVE EXAMPLE (Your deployed contracts):**
- **MockIndexOracle**: `0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51`
- **IndexPreInteraction**: `0xDdA8d73E09ea8ABAB2D9d187e89Ae696F83AA10b`  
- **IndexLimitOrderFactory**: `0x8b6E93743f7Fb866eC8C2A7043D4Ca876725363d`

## 🧪 Step 6: Test Your Deployment

### **Test 1: Check Oracle Data**
```bash
# Get Bitcoin price (should show 4500000 = $45,000)
cast call 0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51 "getIndexValue(uint256)(uint256,uint256)" 2 --rpc-url https://sepolia.base.org

# Get Elon's followers (should show 150000000 = 150M)
cast call 0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51 "getIndexValue(uint256)(uint256,uint256)" 1 --rpc-url https://sepolia.base.org
```

### **Test 2: Check IndexPreInteraction**
```bash
# Get BTC_PRICE constant (should return 2)
cast call 0xDdA8d73E09ea8ABAB2D9d187e89Ae696F83AA10b "BTC_PRICE()(uint256)" --rpc-url https://sepolia.base.org
```

### **Test 3: Update Oracle (Live Transaction)**
```bash
# Update Bitcoin price to $50,000
source .env
cast send 0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51 "updateIndex(uint8,uint256)" 2 5000000 --private-key $PRIVATE_KEY --rpc-url https://sepolia.base.org
```

## 🌐 Step 7: View on BaseScan

**Live Contract Links:**
- **MockIndexOracle**: https://sepolia.basescan.org/address/0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51
- **IndexPreInteraction**: https://sepolia.basescan.org/address/0xDdA8d73E09ea8ABAB2D9d187e89Ae696F83AA10b
- **IndexLimitOrderFactory**: https://sepolia.basescan.org/address/0x8b6E93743f7Fb866eC8C2A7043D4Ca876725363d

## 🎮 Step 8: Run Web3.js Workflow

### **Install Dependencies:**
```bash
npm install web3 dotenv
```

### **Update Contract Addresses in web3_workflow.js:**
```javascript
CONTRACTS: {
    IndexPreInteraction: '0xDdA8d73E09ea8ABAB2D9d187e89Ae696F83AA10b',
    IndexLimitOrderFactory: '0x8b6E93743f7Fb866eC8C2A7043D4Ca876725363d', 
    MockIndexOracle: '0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    WETH: '0x4200000000000000000000000000000000000006'  // Base Sepolia WETH
}
```

### **Run Complete Workflow:**
```bash
node web3_workflow.js
```

## 💰 Expected Costs

| Action | Gas Used | ETH Cost | USD Cost |
|--------|----------|----------|----------|
| Deploy MockIndexOracle | ~923k | ~0.0009 ETH | ~$2 |
| Deploy IndexPreInteraction | ~2.1M | ~0.002 ETH | ~$5 |
| Deploy IndexLimitOrderFactory | ~430k | ~0.0004 ETH | ~$1 |
| **Total Deployment** | **~3.5M** | **~0.004 ETH** | **~$8** |
| Update Oracle | ~36k | ~0.00004 ETH | ~$0.08 |

## 🔍 Troubleshooting

### **❌ "missing hex prefix" Error**
**Fix:** Add `0x` to your private key in `.env`
```env
PRIVATE_KEY=0x1234567890abcdef...  # ✅ Correct
PRIVATE_KEY=1234567890abcdef...    # ❌ Wrong
```

### **❌ "insufficient funds" Error**  
**Fix:** Get more testnet ETH from faucets
```bash
# Check balance
cast balance YOUR_ADDRESS --rpc-url https://sepolia.base.org
```

### **❌ "contract creation failed" Error**
**Fix:** Clean and rebuild
```bash
forge clean
forge build
```

### **❌ "nonce too low" Error**
**Fix:** Wait a few minutes and retry

## 📊 What You've Built

### **🌟 Revolutionary Features:**

1. **✅ Generalized Index System** - Users can create unlimited custom indices
2. **✅ Real-World Conditions** - Orders execute based on external data
3. **✅ 1inch Integration** - Full compatibility with 1inch Protocol v4
4. **✅ Fallback Oracles** - Multiple data sources with smart routing
5. **✅ Live on Blockchain** - Deployed and verified on Base Sepolia

### **🎯 Supported Data Sources:**
- 📈 **Financial**: Bitcoin, stocks, inflation, unemployment
- 🐦 **Social**: Twitter followers, engagement metrics
- 📊 **Market**: VIX volatility, economic indicators
- 🔧 **Custom**: Any oracle you register!

### **💡 Use Cases Enabled:**
- 🗳️ **Election Trading** - Execute when candidate wins
- 🌊 **Disaster Hedging** - Trade on earthquake magnitude
- 🛰️ **Climate Markets** - Carbon credits on CO2 levels
- 🎵 **Entertainment** - NFT trades when song hits charts
- 🏆 **Sports Betting** - Execute on tournament results

## 🎉 Success Indicators

**✅ Deployment successful when:**
- All 3 contracts deployed without errors
- Oracle returns valid data (BTC: 4500000, Elon: 150000000)  
- IndexPreInteraction constants work (BTC_PRICE returns 2)
- BaseScan shows contract code
- Test transactions succeed

## 🚀 Next Steps

1. **🎮 Create Custom Indices** - Register your own data sources
2. **🌐 Connect Frontend** - Build UI for conditional orders
3. **📊 Add Real APIs** - Integrate Chainlink Functions for live data
4. **🎯 Production Deploy** - Move to Base Mainnet
5. **🎪 Demo Ready** - Show off your revolutionary system!

---

## 📞 Quick Commands Reference

```bash
# Deploy everything
source .env && forge script script/DeployOnly.s.sol --rpc-url https://sepolia.base.org --private-key $PRIVATE_KEY --broadcast

# Test oracle
cast call 0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51 "getIndexValue(uint256)(uint256,uint256)" 2 --rpc-url https://sepolia.base.org

# Update price  
cast send 0x164491FE1B4397d0c3F4ea34f792e3103F4B0F51 "updateIndex(uint8,uint256)" 2 5000000 --private-key $PRIVATE_KEY --rpc-url https://sepolia.base.org

# Run workflow
node web3_workflow.js
```

---

**🌟 Congratulations! You've deployed the world's first generalized conditional trading system!** 

**Your contracts are LIVE on Base Sepolia and ready to revolutionize DeFi!** 🚀