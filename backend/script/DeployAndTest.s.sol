// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockIndexOracle.sol";
import "../contracts/IndexPreInteraction.sol";
import "../contracts/IndexLimitOrderFactory.sol";
import "../contracts/interfaces/I1inch.sol";

/**
 * @title DeployAndTest
 * @dev Deployment script for Base Sepolia fork testing
 */
contract DeployAndTest is Script {
    // Deployed contract addresses
    MockIndexOracle public oracle;
    IndexPreInteraction public preInteraction;
    IndexLimitOrderFactory public factory;
    
    // Base Sepolia addresses
    address constant ONEINCH_LIMIT_ORDER = 0xE53136D9De56672e8D2665C98653AC7b8A60Dc44;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    function run() public {
        console.log("=== Deploying Index Limit Order System ===");
        console.log("Network: Base Sepolia Fork");
        console.log("1inch Protocol:", ONEINCH_LIMIT_ORDER);
        
        // Get deployer from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Deployer Balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contracts
        deployContracts();
        
        // Initialize system
        initializeSystem();
        
        // Run integration tests
        runIntegrationTests();
        
        vm.stopBroadcast();
        
        // Save deployment info
        saveDeploymentInfo();
        
        console.log("=== Deployment and Testing Complete ===");
    }
    
    function deployContracts() internal {
        console.log("\nDeploying Contracts...");
        
        // Deploy MockIndexOracle
        oracle = new MockIndexOracle();
        console.log("MockIndexOracle:", address(oracle));
        
        // Deploy IndexPreInteraction
        preInteraction = new IndexPreInteraction(address(oracle));
        console.log("IndexPreInteraction:", address(preInteraction));
        
        // Deploy IndexLimitOrderFactory
        factory = new IndexLimitOrderFactory(preInteraction);
        console.log("IndexLimitOrderFactory:", address(factory));
        
        console.log("[OK] All contracts deployed successfully");
    }
    
    function initializeSystem() internal {
        console.log("\nInitializing System...");
        
        // Set realistic initial values
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 43000 * 100);
        oracle.updateIndex(MockIndexOracle.IndexType.ELON_FOLLOWERS, 150000000);
        oracle.updateIndex(MockIndexOracle.IndexType.INFLATION_RATE, 320);
        oracle.updateIndex(MockIndexOracle.IndexType.VIX_INDEX, 1850);
        oracle.updateIndex(MockIndexOracle.IndexType.UNEMPLOYMENT_RATE, 370);
        oracle.updateIndex(MockIndexOracle.IndexType.TESLA_STOCK, 248 * 100);
        
        console.log("Oracle initialized with realistic values");
    }
    
    function runIntegrationTests() internal {
        console.log("\nRunning Integration Tests...");
        
        address testMaker = vm.addr(1);
        vm.deal(testMaker, 1 ether);
        
        // Test 1: Create order
        console.log("Test 1: Creating index-based order...");
        vm.startPrank(testMaker);
        
        (IOrderMixin.Order memory order, bytes memory extension) = factory.createIndexOrder(
            12345,
            testMaker,
            testMaker,
            USDC,
            WETH,
            1000 * 10**6,
            0.5 ether,
            2, // BTC_PRICE
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            45000 * 100,
            uint40(block.timestamp + 3600)
        );
        
        vm.stopPrank();
        
        bytes32 orderHash = factory.getOrderHash(order);
        console.log("Order created with hash:", vm.toString(orderHash));
        
        // Test 2: Validate condition (should fail initially)
        console.log("\nTest 2: Validating condition (BTC @ $43k, need > $45k)...");
        bool isValid = preInteraction.validateOrderCondition(orderHash);
        require(!isValid, "Order should not be valid initially");
        console.log("Validation result:", isValid ? "PASS" : "FAIL (expected)");
        
        // Test 3: Update oracle and revalidate
        console.log("\nTest 3: Updating BTC price to $46k...");
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 46000 * 100);
        
        isValid = preInteraction.validateOrderCondition(orderHash);
        require(isValid, "Order should be valid after price update");
        console.log("Validation result:", isValid ? "PASS" : "FAIL");
        
        console.log("Integration tests passed!");
    }
    
    function saveDeploymentInfo() internal {
        console.log("\n[INFO] Deployment Summary:");
        console.log("MockIndexOracle:", address(oracle));
        console.log("IndexPreInteraction:", address(preInteraction));
        console.log("IndexLimitOrderFactory:", address(factory));
        console.log("1inch Protocol:", ONEINCH_LIMIT_ORDER);
        
        // In a real script, you'd save this to a JSON file
        console.log("\n[TARGET] Ready for frontend integration!");
    }
}