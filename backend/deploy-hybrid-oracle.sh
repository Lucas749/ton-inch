#!/bin/bash

# Deploy Hybrid Oracle (Updated MockIndexOracle) to Base Mainnet
# This script deploys the enhanced oracle that supports both Mock and Chainlink data sources

echo "🔗 DEPLOYING HYBRID ORACLE TO BASE MAINNET"
echo "==========================================="
echo ""

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    echo "💡 Set it with: export PRIVATE_KEY=0xYOUR_PRIVATE_KEY"
    echo "💡 Or add it to your .env file"
    exit 1
fi

# Check if RPC URL is set
if [ -z "$RPC_URL" ]; then
    echo "❌ Error: RPC_URL environment variable not set"
    echo "💡 Set it with: export RPC_URL=https://base.llamarpc.com"
    echo "💡 Or add it to your .env file"
    exit 1
fi

echo "🔧 Configuration:"
echo "   Network: Base Mainnet (Chain ID: 8453)"
echo "   RPC URL: $RPC_URL"
echo "   Contract: MockIndexOracle (Hybrid)"
echo ""

echo "📋 Features:"
echo "   ✅ Mock Oracle - Local test data"
echo "   ✅ Chainlink Functions - Real-world data"
echo "   ✅ Per-index oracle type selection"
echo "   ✅ Automatic fallback to mock data"
echo "   ✅ Seamless frontend integration"
echo ""

echo "🚀 Starting deployment..."
echo ""

# Deploy using foundry
forge script script/DeployMockOracle.s.sol:DeployMockOracle \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ HYBRID ORACLE DEPLOYMENT COMPLETED!"
    echo "====================================="
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "1. Copy the deployed contract address"
    echo "2. Update INDEX_ORACLE_ADDRESS in your .env file"
    echo "3. Deploy ChainlinkIndexOracle contract if needed"
    echo "4. Set CHAINLINK_ORACLE_ADDRESS in .env"
    echo "5. Run: node test-hybrid-oracle.js"
    echo ""
    echo "🔧 To configure the hybrid oracle:"
    echo "   node -e \"const oracle = require('./src/oracle-manager'); oracle.setChainlinkOracleAddress('0xCHAINLINK_ADDRESS', process.env.PRIVATE_KEY)\""
    echo ""
    echo "🔄 To switch an index to Chainlink:"
    echo "   node -e \"const oracle = require('./src/oracle-manager'); oracle.setIndexOracleType(3, 1, process.env.PRIVATE_KEY)\" # VIX to Chainlink"
    echo ""
    echo "📊 To check hybrid status:"
    echo "   node -e \"const oracle = require('./src/oracle-manager'); oracle.getHybridOracleStatus().then(console.log)\""
    echo ""
else
    echo ""
    echo "❌ DEPLOYMENT FAILED"
    echo "==================="
    echo "Please check the error messages above and try again."
    echo ""
    echo "💡 Common issues:"
    echo "   - Insufficient ETH balance for gas"
    echo "   - Network connectivity issues"
    echo "   - Invalid private key"
    echo ""
fi