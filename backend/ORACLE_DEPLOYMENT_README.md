# 🔮 MockIndexOracle Deployment Guide

## Quick Deploy

Choose your preferred method:

### Option 1: Foundry (Recommended)
```bash
# Set your private key
export PRIVATE_KEY=0x...

# Deploy to Base Mainnet
./deploy-oracle.sh
```

### Option 2: JavaScript/Ethers
```bash
# Set your private key
export PRIVATE_KEY=0x...

# Deploy using Node.js
node deploy-oracle-simple.js
```

### Option 3: Manual Foundry Command
```bash
forge script script/DeployMockOracle.s.sol:DeployMockOracle \
    --rpc-url https://base.llamarpc.com \
    --chain-id 8453 \
    --broadcast \
    --verify \
    -vvv
```

## After Deployment

1. **Copy the deployed address** from the output
2. **Set environment variable**:
   ```bash
   export INDEX_ORACLE_ADDRESS=0x[deployed_address]
   ```
3. **Test predicates**:
   ```bash
   ONEINCH_API_KEY=xxx INDEX_ORACLE_ADDRESS=0x[deployed_address] npm run index-trading
   ```

## What This Deploys

**MockIndexOracle** provides these index values:
- **ID 0**: APPLE Stock (~$185)
- **ID 1**: ELON_FOLLOWERS (~140M)
- **ID 2**: BTC_PRICE (~$95,000)
- **ID 3**: VIX Index (~15)
- **ID 4**: UNEMPLOYMENT_RATE (~4%)
- **ID 5**: TESLA Stock (~$240)

## How Predicates Use It

Once deployed, your 1inch limit orders will include predicates like:
```
gt(170, arbitraryStaticCall(ORACLE_ADDRESS, "getIndexValue(0)"))
```

This means: "Execute order when APPLE > $170"

## Requirements

- Base Mainnet ETH for gas (~$1-5)
- Private key with deployment permissions
- Foundry installed (for option 1) OR Node.js (for option 2)

## Security Note

⚠️ **MockIndexOracle provides MOCK data for testing**
- Values are hardcoded and don't update automatically
- For production, replace with real oracle feeds (Chainlink, etc.)
- Current values are reasonable for demo purposes

🚀 **Ready to deploy? Choose an option above!**