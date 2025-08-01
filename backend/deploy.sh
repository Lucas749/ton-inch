#!/bin/bash

# Base Sepolia Deployment Script for IndexPreInteraction System

echo "🚀 Deploying IndexPreInteraction to Base Sepolia..."

# Load environment variables
source .env

# Check if private key is set
if [ "$PRIVATE_KEY" = "your_private_key_here" ]; then
    echo "❌ ERROR: Please set your PRIVATE_KEY in .env file"
    echo "Edit .env and replace 'your_private_key_here' with your actual private key"
    exit 1
fi

# Get wallet address
WALLET_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "👛 Deploying from: $WALLET_ADDRESS"

# Check balance
BALANCE=$(cast balance $WALLET_ADDRESS --rpc-url https://sepolia.base.org)
echo "💰 Current balance: $BALANCE wei"

# Check if balance is sufficient (at least 0.01 ETH = 10000000000000000 wei)
MIN_BALANCE="10000000000000000"
if [ "$BALANCE" -lt "$MIN_BALANCE" ]; then
    echo "❌ ERROR: Insufficient balance for deployment"
    echo "You have: $BALANCE wei"
    echo "Need at least: $MIN_BALANCE wei (0.01 ETH)"
    echo ""
    echo "Get testnet ETH from:"
    echo "- https://www.coinbase.com/faucets/base-sepolia-faucet"
    echo "- https://app.optimism.io/faucet"
    exit 1
fi

echo "✅ Balance sufficient for deployment"
echo ""
echo "📡 Deploying contracts to Base Sepolia..."

# Deploy contracts
forge script script/DeployAndTest.s.sol \
    --rpc-url https://sepolia.base.org \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --gas-estimate-multiplier 120

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy the contract addresses from the output above"
    echo "2. Update web3_workflow.js with the new addresses"
    echo "3. Run: npm run workflow"
    echo ""
    echo "💡 Look for lines like:"
    echo "   MockIndexOracle deployed at: 0x..."
    echo "   IndexPreInteraction deployed at: 0x..."
    echo "   IndexLimitOrderFactory deployed at: 0x..."
else
    echo "❌ DEPLOYMENT FAILED!"
    echo "Check the error messages above"
fi