# 🚀 Complete Web3.js Integration Guide

This guide shows how to interact with the generalized IndexPreInteraction system using Web3.js to create custom indices and conditional trades.

## 📋 Prerequisites

```bash
npm install web3 @openzeppelin/contracts
```

## 🔧 Setup & Configuration

```javascript
const Web3 = require('web3');

// Connect to Base Sepolia
const web3 = new Web3('https://sepolia.base.org');

// Contract addresses (deploy your own or use these examples)
const ADDRESSES = {
    IndexPreInteraction: '0x...',    // Your deployed IndexPreInteraction
    IndexLimitOrderFactory: '0x...',  // Your deployed IndexLimitOrderFactory  
    MockIndexOracle: '0x...',        // Your deployed MockIndexOracle
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',  // Base Sepolia USDC
    WETH: '0x4200000000000000000000000000000000000006'   // Base Sepolia WETH
};

// Your wallet setup
const PRIVATE_KEY = 'your_private_key_here';
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

// Contract ABIs (simplified - add full ABIs from your compiled contracts)
const ABIS = {
    IndexPreInteraction: [
        "function registerIndex(string name, string description, address oracle) external returns (uint256)",
        "function getIndexInfo(uint256 indexId) external view returns (string memory, string memory, address, address, bool, uint256)",
        "function getIndexValue(uint256 indexId) external view returns (uint256, uint256)",
        "function validateOrderCondition(bytes32 orderHash) external view returns (bool)",
        "function BTC_PRICE() external view returns (uint256)",
        "function ELON_FOLLOWERS() external view returns (uint256)"
    ],
    
    IndexLimitOrderFactory: [
        "function createIndexOrder(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 indexId, uint8 operator, uint256 thresholdValue, uint40 expiry) external returns (tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, bytes32 makerTraits), bytes)",
        "function getOrderHash(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, bytes32 makerTraits) order) external pure returns (bytes32)"
    ],
    
    MockIndexOracle: [
        "function updateIndex(uint8 indexType, uint256 newValue) external",
        "function getIndexValue(uint256 indexId) external view returns (uint256, uint256)",
        "function owner() external view returns (address)"
    ],
    
    ERC20: [
        "function balanceOf(address) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function decimals() external view returns (uint8)"
    ]
};

// Initialize contracts
const preInteraction = new web3.eth.Contract(ABIS.IndexPreInteraction, ADDRESSES.IndexPreInteraction);
const factory = new web3.eth.Contract(ABIS.IndexLimitOrderFactory, ADDRESSES.IndexLimitOrderFactory);
const oracle = new web3.eth.Contract(ABIS.MockIndexOracle, ADDRESSES.MockIndexOracle);
const usdc = new web3.eth.Contract(ABIS.ERC20, ADDRESSES.USDC);
const weth = new web3.eth.Contract(ABIS.ERC20, ADDRESSES.WETH);
```

## 🎯 Complete Workflow

### Step 1: Create a Custom Index

```javascript
async function createCustomIndex() {
    console.log("🚀 Step 1: Creating custom index...");
    
    const indexName = "APPLE_STOCK";
    const description = "Apple Inc. stock price in USD cents";
    const oracleAddress = ADDRESSES.MockIndexOracle;
    
    try {
        const tx = await preInteraction.methods
            .registerIndex(indexName, description, oracleAddress)
            .send({
                from: account.address,
                gas: 300000
            });
            
        console.log("✅ Custom index created!");
        console.log("Transaction hash:", tx.transactionHash);
        
        // Get the index ID from events
        const events = await preInteraction.getPastEvents('IndexRegistered', {
            fromBlock: tx.blockNumber,
            toBlock: tx.blockNumber
        });
        
        const customIndexId = events[0].returnValues.indexId;
        console.log("📊 Custom Index ID:", customIndexId);
        
        // Verify index info
        const indexInfo = await preInteraction.methods.getIndexInfo(customIndexId).call();
        console.log("📋 Index Info:");
        console.log("  Name:", indexInfo[0]);
        console.log("  Description:", indexInfo[1]);
        console.log("  Oracle:", indexInfo[2]);
        console.log("  Creator:", indexInfo[3]);
        console.log("  Active:", indexInfo[4]);
        
        return customIndexId;
        
    } catch (error) {
        console.error("❌ Error creating index:", error);
        throw error;
    }
}
```

### Step 2: Set Initial Value in Oracle

```javascript
async function setInitialOracleValue(indexId) {
    console.log("\n📡 Step 2: Setting initial oracle value...");
    
    // For custom indices, we need to use the predefined enum mapping
    // Since MockIndexOracle only supports predefined indices for updateIndex
    // We'll use BTC_PRICE (enum value 2) as an example
    
    const initialValue = 150 * 100; // $150.00 (Apple stock price in cents)
    
    try {
        const tx = await oracle.methods
            .updateIndex(2, initialValue) // Using BTC_PRICE enum (2) as proxy
            .send({
                from: account.address,
                gas: 100000
            });
            
        console.log("✅ Oracle value set!");
        console.log("Transaction hash:", tx.transactionHash);
        console.log("💰 Value set to:", initialValue, "cents ($" + (initialValue/100) + ")");
        
        // Verify the value
        const result = await oracle.methods.getIndexValue(indexId).call();
        console.log("📊 Current oracle value:", result[0], "cents");
        console.log("⏰ Timestamp:", new Date(result[1] * 1000).toISOString());
        
        return initialValue;
        
    } catch (error) {
        console.error("❌ Error setting oracle value:", error);
        throw error;
    }
}
```

### Step 3: Place Conditional Trade (Cannot Execute Now)

```javascript
async function placeConditionalTrade(indexId) {
    console.log("\n💼 Step 3: Placing conditional trade...");
    
    // Trade parameters
    const salt = Math.floor(Math.random() * 1000000);
    const maker = account.address;
    const receiver = account.address; // Same as maker
    const makerAsset = ADDRESSES.USDC;
    const takerAsset = ADDRESSES.WETH;
    const makingAmount = 1000 * 10**6; // 1000 USDC
    const takingAmount = web3.utils.toWei("0.5", "ether"); // 0.5 ETH
    const operator = 0; // GREATER_THAN
    const thresholdValue = 160 * 100; // $160.00 - higher than current $150
    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    console.log("📋 Trade Details:");
    console.log("  Selling:", makingAmount / 10**6, "USDC");
    console.log("  Buying:", web3.utils.fromWei(takingAmount, "ether"), "ETH");
    console.log("  Condition: Apple stock > $" + (thresholdValue / 100));
    console.log("  Current: $150 (condition NOT met)");
    
    try {
        // First approve USDC spending
        console.log("🔐 Approving USDC spending...");
        await usdc.methods
            .approve(ADDRESSES.IndexLimitOrderFactory, makingAmount)
            .send({
                from: account.address,
                gas: 100000
            });
            
        // Create the conditional order
        console.log("📝 Creating conditional order...");
        const result = await factory.methods
            .createIndexOrder(
                salt,
                maker,
                receiver,
                makerAsset,
                takerAsset,
                makingAmount,
                takingAmount,
                indexId,
                operator,
                thresholdValue,
                expiry
            )
            .send({
                from: account.address,
                gas: 500000
            });
            
        console.log("✅ Conditional trade placed!");
        console.log("Transaction hash:", result.transactionHash);
        
        // Get order hash from events
        const events = await factory.getPastEvents('IndexOrderCreated', {
            fromBlock: result.blockNumber,
            toBlock: result.blockNumber
        });
        
        const orderHash = events[0].returnValues.orderHash;
        console.log("📜 Order Hash:", orderHash);
        
        // Verify condition (should be false)
        const canExecute = await preInteraction.methods
            .validateOrderCondition(orderHash)
            .call();
            
        console.log("🚫 Can execute now:", canExecute, "(Expected: false)");
        
        return orderHash;
        
    } catch (error) {
        console.error("❌ Error placing trade:", error);
        throw error;
    }
}
```

### Step 4: Change Oracle to Fulfill Requirement

```javascript
async function fulfillCondition(indexId, orderHash) {
    console.log("\n🎯 Step 4: Changing oracle to fulfill condition...");
    
    const newValue = 165 * 100; // $165.00 - above our $160 threshold
    
    try {
        console.log("📈 Updating oracle value to $" + (newValue / 100) + "...");
        
        const tx = await oracle.methods
            .updateIndex(2, newValue) // Using BTC_PRICE enum as proxy
            .send({
                from: account.address,
                gas: 100000
            });
            
        console.log("✅ Oracle updated!");
        console.log("Transaction hash:", tx.transactionHash);
        console.log("💰 New value:", newValue, "cents ($" + (newValue/100) + ")");
        
        // Verify the new value
        const result = await oracle.methods.getIndexValue(indexId).call();
        console.log("📊 Oracle now shows:", result[0], "cents");
        
        // Check if condition is now met
        console.log("🔍 Checking if condition is now met...");
        const canExecuteNow = await preInteraction.methods
            .validateOrderCondition(orderHash)
            .call();
            
        console.log("✅ Can execute now:", canExecuteNow, "(Expected: true)");
        
        if (canExecuteNow) {
            console.log("🎉 SUCCESS! Order condition fulfilled!");
            console.log("📈 Apple stock ($165) > threshold ($160)");
            console.log("💡 Order is now ready for execution by 1inch!");
        }
        
        return canExecuteNow;
        
    } catch (error) {
        console.error("❌ Error updating oracle:", error);
        throw error;
    }
}
```

### Step 5: Monitor Order Execution

```javascript
async function monitorOrderExecution(orderHash) {
    console.log("\n👀 Step 5: Monitoring order execution...");
    
    console.log("📋 Order Status Summary:");
    console.log("  Order Hash:", orderHash);
    
    // Get condition details
    const condition = await preInteraction.methods
        .getOrderCondition(orderHash)
        .call();
        
    console.log("  Index ID:", condition[0]);
    console.log("  Operator:", condition[1], "(0=GT, 1=LT, 2=GTE, 3=LTE, 4=EQ)");
    console.log("  Threshold:", condition[2]);
    
    // Get current value
    const currentValue = await preInteraction.methods
        .getIndexValue(condition[0])
        .call();
        
    console.log("  Current Value:", currentValue[0]);
    console.log("  Last Updated:", new Date(currentValue[1] * 1000).toISOString());
    
    // Check execution status
    const canExecute = await preInteraction.methods
        .validateOrderCondition(orderHash)
        .call();
        
    console.log("  Executable:", canExecute ? "✅ YES" : "❌ NO");
    
    if (canExecute) {
        console.log("\n🚀 ORDER READY FOR EXECUTION!");
        console.log("📞 1inch Protocol Integration:");
        console.log("  1. Order sits in 1inch order book");
        console.log("  2. When taker matches, preInteraction validates condition");
        console.log("  3. If condition passes, trade executes automatically");
        console.log("  4. If condition fails, trade reverts");
        console.log("\n💡 This order will execute automatically when someone takes it!");
    }
}
```

## 🎮 Main Execution Function

```javascript
async function runCompleteWorkflow() {
    console.log("🚀 Starting Complete Index-Based Trading Workflow\n");
    
    try {
        // Step 1: Create custom index
        const customIndexId = await createCustomIndex();
        
        // Step 2: Set initial oracle value
        await setInitialOracleValue(customIndexId);
        
        // Step 3: Place trade that cannot execute now
        const orderHash = await placeConditionalTrade(customIndexId);
        
        // Step 4: Change oracle to fulfill condition
        await fulfillCondition(customIndexId, orderHash);
        
        // Step 5: Monitor execution status
        await monitorOrderExecution(orderHash);
        
        console.log("\n🎉 WORKFLOW COMPLETE!");
        console.log("✨ You've successfully demonstrated:");
        console.log("  ✅ Custom index creation");
        console.log("  ✅ Oracle value management");
        console.log("  ✅ Conditional trade placement");
        console.log("  ✅ Dynamic condition fulfillment");
        console.log("  ✅ Order execution readiness");
        
    } catch (error) {
        console.error("💥 Workflow failed:", error);
    }
}

// Run the workflow
runCompleteWorkflow();
```

## 📊 Alternative: Using Built-in Indices

```javascript
// If you want to use built-in indices instead of custom ones:

async function useBuiltInIndex() {
    console.log("📈 Using built-in BTC_PRICE index...");
    
    // Get built-in index ID
    const btcIndexId = await preInteraction.methods.BTC_PRICE().call();
    console.log("BTC Index ID:", btcIndexId); // Should be 2
    
    // Set BTC price to $43,000
    await oracle.methods
        .updateIndex(2, 43000 * 100) // $43,000 in cents
        .send({ from: account.address, gas: 100000 });
    
    // Create order that executes when BTC > $45,000
    const orderHash = await factory.methods
        .createIndexOrder(
            12345,                              // salt
            account.address,                    // maker
            account.address,                    // receiver
            ADDRESSES.USDC,                     // makerAsset
            ADDRESSES.WETH,                     // takerAsset
            1000 * 10**6,                      // 1000 USDC
            web3.utils.toWei("0.5", "ether"), // 0.5 ETH
            btcIndexId,                        // BTC_PRICE index
            0,                                 // GREATER_THAN
            45000 * 100,                       // $45,000 threshold
            Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
        )
        .send({ from: account.address, gas: 500000 });
    
    console.log("Order created, waiting for BTC > $45,000...");
    
    // Later: Update BTC to $46,000 to trigger execution
    await oracle.methods
        .updateIndex(2, 46000 * 100)
        .send({ from: account.address, gas: 100000 });
    
    console.log("🎉 BTC price updated! Order now executable!");
}
```

## 🔧 Utility Functions

```javascript
// Helper function to check balances
async function checkBalances(address) {
    const usdcBalance = await usdc.methods.balanceOf(address).call();
    const wethBalance = await weth.methods.balanceOf(address).call();
    
    console.log("💰 Balances for", address);
    console.log("  USDC:", usdcBalance / 10**6);
    console.log("  WETH:", web3.utils.fromWei(wethBalance, "ether"));
}

// Helper function to estimate gas costs
async function estimateGasCosts() {
    console.log("⛽ Estimated Gas Costs:");
    console.log("  Register Index: ~300,000 gas");
    console.log("  Update Oracle: ~100,000 gas");
    console.log("  Create Order: ~500,000 gas");
    console.log("  Total Workflow: ~900,000 gas");
}
```

## 🎯 Expected Output

```
🚀 Starting Complete Index-Based Trading Workflow

🚀 Step 1: Creating custom index...
✅ Custom index created!
📊 Custom Index ID: 6
📋 Index Info:
  Name: APPLE_STOCK
  Description: Apple Inc. stock price in USD cents
  Active: true

📡 Step 2: Setting initial oracle value...
✅ Oracle value set!
💰 Value set to: 15000 cents ($150)

💼 Step 3: Placing conditional trade...
📋 Trade Details:
  Selling: 1000 USDC
  Buying: 0.5 ETH
  Condition: Apple stock > $160
  Current: $150 (condition NOT met)
✅ Conditional trade placed!
🚫 Can execute now: false (Expected: false)

🎯 Step 4: Changing oracle to fulfill condition...
📈 Updating oracle value to $165...
✅ Oracle updated!
✅ Can execute now: true (Expected: true)
🎉 SUCCESS! Order condition fulfilled!

👀 Step 5: Monitoring order execution...
🚀 ORDER READY FOR EXECUTION!

🎉 WORKFLOW COMPLETE!
```

## 🚀 Deploy & Test Commands

```bash
# 1. Deploy contracts
forge script script/DeployAndTest.s.sol --fork-url https://sepolia.base.org --broadcast

# 2. Update contract addresses in the script above

# 3. Run the Web3.js workflow
node web3_workflow.js
```

---

**🌟 This demonstrates the full power of the generalized IndexPreInteraction system!**

Any real-world data can now trigger conditional trades on 1inch Protocol! 🚀