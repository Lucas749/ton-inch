# 🚀 Quick Setup Instructions

## 1. Install Dependencies

```bash
cd backend
npm install web3 dotenv
```

## 2. Deploy Contracts

```bash
# Deploy to Base Sepolia fork
forge script script/DeployAndTest.s.sol --fork-url https://sepolia.base.org --broadcast
```

## 3. Update Contract Addresses

After deployment, update the contract addresses in `web3_workflow.js`:

```javascript
CONTRACTS: {
    IndexPreInteraction: '0x...', // Copy from deployment output
    IndexLimitOrderFactory: '0x...', // Copy from deployment output
    MockIndexOracle: '0x...', // Copy from deployment output
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    WETH: '0x4200000000000000000000000000000000000006'  // Base Sepolia WETH
}
```

## 4. Set Your Private Key

Create a `.env` file (copy from `env.example`):

```bash
cp env.example .env
```

Edit `.env` and add your private key:

```
PRIVATE_KEY=your_actual_private_key_here
```

## 5. Run the Complete Workflow

```bash
node web3_workflow.js
```

## Expected Output

```
🚀 Starting Complete Index-Based Trading Workflow
👛 Wallet address: 0x...

🚀 Step 1: Creating custom index...
✅ Custom index created!
📊 Custom Index ID: 6

📡 Step 2: Setting initial oracle value...
✅ Oracle value set!
💰 Value set to: 15000 cents ($150)

💼 Step 3: Placing conditional trade...
✅ Conditional trade placed!
🚫 Can execute now: false (Expected: false)

🎯 Step 4: Changing oracle to fulfill condition...
✅ Oracle updated!
✅ Can execute now: true (Expected: true)
🎉 SUCCESS! Order condition fulfilled!

👀 Step 5: Monitoring order execution...
🚀 ORDER READY FOR EXECUTION!

🎉 WORKFLOW COMPLETE!
```

## Troubleshooting

### Contract addresses not set
Update the `CONFIG.CONTRACTS` object in `web3_workflow.js` with your deployed contract addresses.

### Private key issues
- Make sure your `.env` file exists and contains a valid private key
- Ensure your address has ETH on Base Sepolia for gas fees
- Get testnet ETH from Base Sepolia faucet

### RPC connection errors
- The script uses the public Base Sepolia RPC
- For better reliability, consider using Alchemy or Infura

### Gas estimation errors
- The script uses conservative gas limits
- Adjust gas values in the script if needed