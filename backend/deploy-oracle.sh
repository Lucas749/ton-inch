#!/bin/bash

# Deploy MockIndexOracle to Base Mainnet
# Usage: ./deploy-oracle.sh

set -e

echo "🚀 Deploying MockIndexOracle to Base Mainnet..."
echo "==============================================="

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    echo "   Set it with: export PRIVATE_KEY=0x..."
    exit 1
fi

# Base Mainnet configuration
CHAIN_ID=8453
RPC_URL="https://base.llamarpc.com"

echo "📡 Network: Base Mainnet (Chain ID: $CHAIN_ID)"
echo "🔗 RPC URL: $RPC_URL"
echo "📝 Deploying: MockIndexOracle.sol"
echo ""

# Deploy using Foundry
forge script script/DeployMockOracle.s.sol:DeployMockOracle \
    --rpc-url $RPC_URL \
    --chain-id $CHAIN_ID \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvv

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔧 To use the oracle with predicates:"
echo "   1. Copy the deployed address from above"
echo "   2. Set: export INDEX_ORACLE_ADDRESS=0x[deployed_address]"
echo "   3. Run: npm run index-trading"
echo ""
echo "🔮 Index predicates will now work!"