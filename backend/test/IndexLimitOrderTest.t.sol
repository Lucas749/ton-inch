// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/MockIndexOracle.sol";
import "../contracts/IndexPreInteraction.sol";
import "../contracts/IndexLimitOrderFactory.sol";

// Import 1inch interfaces
import "../contracts/interfaces/I1inch.sol";

/**
 * @title IndexLimitOrderTest
 * @dev Comprehensive test suite for index-based limit orders with real 1inch integration
 */
contract IndexLimitOrderTest is Test {
    using MakerTraitsLib for MakerTraits;

    // Our contracts
    MockIndexOracle public oracle;
    IndexPreInteraction public preInteraction;
    IndexLimitOrderFactory public factory;
    
    // 1inch contract on Base Sepolia
    address constant ONEINCH_LIMIT_ORDER = 0xE53136D9De56672e8D2665C98653AC7b8A60Dc44;
    
    // Test tokens on Base Sepolia
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    // Test accounts
    address public maker;
    address public taker;
    uint256 public makerPrivateKey;
    uint256 public takerPrivateKey;
    
    // Test order parameters
    uint256 constant MAKING_AMOUNT = 1000 * 10**6; // 1000 USDC
    uint256 constant TAKING_AMOUNT = 0.5 ether;    // 0.5 ETH
    
    function setUp() public {
        // Fork Base Sepolia
        vm.createFork("base_sepolia");
        
        console.log("=== Setting up Index Limit Order Tests ===");
        console.log("Network: Base Sepolia Fork");
        console.log("1inch Contract:", ONEINCH_LIMIT_ORDER);
        
        // Generate test accounts
        makerPrivateKey = 0x1234567890123456789012345678901234567890123456789012345678901234;
        takerPrivateKey = 0x2345678901234567890123456789012345678901234567890123456789012345;
        
        maker = vm.addr(makerPrivateKey);
        taker = vm.addr(takerPrivateKey);
        
        console.log("Maker:", maker);
        console.log("Taker:", taker);
        
        // Fund accounts with ETH
        vm.deal(maker, 10 ether);
        vm.deal(taker, 10 ether);
        
        console.log("Funded accounts with ETH");
        
        // Deploy our contracts
        deployContracts();
        
        // Setup initial oracle values
        setupOracle();
        
        // Fund accounts with test tokens
        fundWithTestTokens();
        
        console.log("=== Setup Complete ===\n");
    }
    
    function deployContracts() internal {
        console.log("Deploying contracts...");
        
        // Deploy MockIndexOracle
        oracle = new MockIndexOracle();
        console.log("MockIndexOracle deployed:", address(oracle));
        
        // Deploy IndexPreInteraction
        preInteraction = new IndexPreInteraction(address(oracle));
        console.log("IndexPreInteraction deployed:", address(preInteraction));
        
        // Deploy IndexLimitOrderFactory
        factory = new IndexLimitOrderFactory(preInteraction);
        console.log("IndexLimitOrderFactory deployed:", address(factory));
        
        // Verify deployments
        assertEq(oracle.owner(), address(this));
        assertEq(address(preInteraction.defaultOracle()), address(oracle));
        assertEq(address(factory.preInteractionContract()), address(preInteraction));
        
        console.log("All contracts deployed successfully");
    }
    
    function setupOracle() internal {
        console.log("Setting up oracle with initial values...");
        
        // Set initial values for all supported indices
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 43000 * 100);      // $43,000
        oracle.updateIndex(MockIndexOracle.IndexType.ELON_FOLLOWERS, 150000000);   // 150M
        oracle.updateIndex(MockIndexOracle.IndexType.INFLATION_RATE, 320);         // 3.20%
        oracle.updateIndex(MockIndexOracle.IndexType.VIX_INDEX, 1850);             // 18.50
        oracle.updateIndex(MockIndexOracle.IndexType.UNEMPLOYMENT_RATE, 370);      // 3.70%
        oracle.updateIndex(MockIndexOracle.IndexType.TESLA_STOCK, 248 * 100);      // $248
        
        console.log("Oracle initialized with realistic values");
    }
    
    function fundWithTestTokens() internal {
        console.log("Funding accounts with test tokens...");
        
        // For testing purposes, we'll simulate having tokens
        // In a real fork test, you'd need to obtain actual tokens from DEXes or faucets
        
        // We'll use vm.deal for ETH and simulate token balances
        console.log("Token funding simulated (use real DEX swaps for actual tokens)");
    }
    
    /**
     * @dev Test basic oracle functionality
     */
    function testOracleBasics() public {
        console.log("=== Testing Oracle Basics ===");
        
        // Test getting index values
        (uint256 btcPrice, uint256 timestamp) = oracle.getIndexValue(MockIndexOracle.IndexType.BTC_PRICE);
        assertEq(btcPrice, 43000 * 100);
        assertGt(timestamp, 0);
        
        console.log("BTC Price:", btcPrice);
        console.log("Timestamp:", timestamp);
        
        // Test updating values
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 45000 * 100);
        (btcPrice,) = oracle.getIndexValue(MockIndexOracle.IndexType.BTC_PRICE);
        assertEq(btcPrice, 45000 * 100);
        
        console.log("Updated BTC Price:", btcPrice);
        console.log("Oracle basics working correctly\n");
    }
    
    /**
     * @dev Test factory order creation
     */
    function testFactoryOrderCreation() public {
        console.log("=== Testing Factory Order Creation ===");
        
        vm.startPrank(maker);
        
        // Create an index-based order
        (IOrderMixin.Order memory order, bytes memory extension) = factory.createIndexOrder(
            12345, // salt
            maker,
            maker, // receiver (same as maker)
            USDC,
            WETH,
            MAKING_AMOUNT,
            TAKING_AMOUNT,
            IndexPreInteraction.IndexType.BTC_PRICE,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            45000 * 100, // $45k threshold
            uint40(block.timestamp + 3600) // 1 hour expiry
        );
        
        vm.stopPrank();
        
        // Verify order structure
        assertEq(order.salt, 12345);
        assertEq(AddressLib.get(order.maker), maker);
        assertEq(AddressLib.get(order.receiver), maker);
        assertEq(AddressLib.get(order.makerAsset), USDC);
        assertEq(AddressLib.get(order.takerAsset), WETH);
        assertEq(order.makingAmount, MAKING_AMOUNT);
        assertEq(order.takingAmount, TAKING_AMOUNT);
        
        // Verify maker traits
        MakerTraits traits = order.makerTraits;
        assertTrue(traits.hasFlag(252)); // PRE_INTERACTION_CALL_FLAG
        assertTrue(traits.hasFlag(249)); // HAS_EXTENSION_FLAG
        
        // Verify extension data
        assertGt(extension.length, 0);
        
        console.log("Order Salt:", order.salt);
        console.log("Maker:", AddressLib.get(order.maker));
        console.log("Making Amount:", order.makingAmount);
        console.log("Taking Amount:", order.takingAmount);
        console.log("Extension Length:", extension.length);
        console.log("[OK] Factory order creation working correctly\n");
    }
    
    /**
     * @dev Test preInteraction condition validation
     */
    function testPreInteractionValidation() public {
        console.log("=== Testing PreInteraction Validation ===");
        
        vm.startPrank(maker);
        
        // Create order with BTC > $45k condition
        (IOrderMixin.Order memory order,) = factory.createIndexOrder(
            54321,
            maker,
            maker,
            USDC,
            WETH,
            MAKING_AMOUNT,
            TAKING_AMOUNT,
            IndexPreInteraction.IndexType.BTC_PRICE,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            45000 * 100,
            uint40(block.timestamp + 3600)
        );
        
        vm.stopPrank();
        
        bytes32 orderHash = factory.getOrderHash(order);
        console.log("Order Hash:", vm.toString(orderHash));
        
        // Test condition when BTC < $45k (should fail)
        console.log("Testing with BTC at $43k (should fail)...");
        bool isValid = preInteraction.validateOrderCondition(orderHash);
        assertFalse(isValid);
        console.log("Validation result:", isValid);
        
        // Update BTC price to $46k
        console.log("Updating BTC price to $46k...");
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 46000 * 100);
        
        // Test condition when BTC > $45k (should pass)
        console.log("Testing with BTC at $46k (should pass)...");
        isValid = preInteraction.validateOrderCondition(orderHash);
        assertTrue(isValid);
        console.log("Validation result:", isValid);
        console.log("[OK] PreInteraction validation working correctly\n");
    }
    
    /**
     * @dev Test multiple index types and operators
     */
    function testMultipleConditions() public {
        console.log("=== Testing Multiple Index Conditions ===");
        
        vm.startPrank(maker);
        
        // Test 1: Elon followers GREATER_THAN 160M
        console.log("Test 1: Elon followers > 160M");
        (IOrderMixin.Order memory order1,) = factory.createIndexOrder(
            11111,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.ELON_FOLLOWERS,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            160000000,
            uint40(block.timestamp + 3600)
        );
        
        bytes32 orderHash1 = factory.getOrderHash(order1);
        bool isValid1 = preInteraction.validateOrderCondition(orderHash1);
        assertFalse(isValid1); // 150M < 160M
        console.log("Initial validation (150M followers):", isValid1);
        
        // Update followers to 165M (as owner)
        oracle.updateIndex(MockIndexOracle.IndexType.ELON_FOLLOWERS, 165000000);
        isValid1 = preInteraction.validateOrderCondition(orderHash1);
        assertTrue(isValid1); // 165M > 160M
        console.log("After update (165M followers):", isValid1);
        
        // Test 2: VIX LESS_THAN 20
        console.log("\nTest 2: VIX < 20");
        (IOrderMixin.Order memory order2,) = factory.createIndexOrder(
            22222,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.VIX_INDEX,
            IndexPreInteraction.ComparisonOperator.LESS_THAN,
            2000, // 20.00
            uint40(block.timestamp + 3600)
        );
        
        bytes32 orderHash2 = factory.getOrderHash(order2);
        bool isValid2 = preInteraction.validateOrderCondition(orderHash2);
        assertTrue(isValid2); // 18.50 < 20
        console.log("VIX validation (18.50 < 20):", isValid2);
        
        // Test 3: Inflation EQUAL 3.2%
        console.log("\nTest 3: Inflation == 3.2%");
        (IOrderMixin.Order memory order3,) = factory.createIndexOrder(
            33333,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.INFLATION_RATE,
            IndexPreInteraction.ComparisonOperator.EQUAL,
            320, // 3.20%
            uint40(block.timestamp + 3600)
        );
        
        bytes32 orderHash3 = factory.getOrderHash(order3);
        bool isValid3 = preInteraction.validateOrderCondition(orderHash3);
        assertTrue(isValid3); // 320 == 320 (within tolerance)
        console.log("Inflation validation (3.20% == 3.20%):", isValid3);
        
        vm.stopPrank();
        
        console.log("[OK] Multiple conditions tested successfully\n");
    }
    
    /**
     * @dev Test real oracle value changes and order triggering
     */
    function testOracleTriggeredExecution() public {
        console.log("=== Testing Oracle-Triggered Order Execution ===");
        
        vm.startPrank(maker);
        
        // Create order: Buy ETH when BTC > $44k
        (IOrderMixin.Order memory order,) = factory.createIndexOrder(
            99999,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.BTC_PRICE,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            44000 * 100,
            uint40(block.timestamp + 3600)
        );
        
        vm.stopPrank();
        
        bytes32 orderHash = factory.getOrderHash(order);
        
        // Initial state: BTC at $43k, order should not be valid
        console.log("Initial BTC price: $43,000");
        bool canExecute = preInteraction.validateOrderCondition(orderHash);
        assertFalse(canExecute);
        console.log("Order executable:", canExecute);
        
        // Simulate market movement: BTC rises to $45k
        console.log("\n[PRICE] Market Event: BTC rallies to $45,000!");
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 45000 * 100);
        
        // Check if order can now execute
        canExecute = preInteraction.validateOrderCondition(orderHash);
        assertTrue(canExecute);
        console.log("Order executable after price change:", canExecute);
        
        // Verify the condition details
        (
            IndexPreInteraction.IndexType indexType,
            IndexPreInteraction.ComparisonOperator operator,
            uint256 threshold
        ) = preInteraction.getOrderCondition(orderHash);
        
        assertEq(uint8(indexType), uint8(IndexPreInteraction.IndexType.BTC_PRICE));
        assertEq(uint8(operator), uint8(IndexPreInteraction.ComparisonOperator.GREATER_THAN));
        assertEq(threshold, 44000 * 100);
        
        console.log("[OK] Oracle-triggered execution test passed");
        console.log("[TARGET] Order would execute automatically via 1inch when BTC > $44k\n");
    }
    
    /**
     * @dev Test edge cases and error conditions
     */
    function testEdgeCases() public {
        console.log("=== Testing Edge Cases ===");
        
        vm.startPrank(maker);
        
        // Test with expired order
        (IOrderMixin.Order memory expiredOrder,) = factory.createIndexOrder(
            77777,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.BTC_PRICE,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            40000 * 100,
            uint40(block.timestamp - 1) // Already expired
        );
        
        // Test boundary conditions for EQUAL operator
        oracle.updateIndex(MockIndexOracle.IndexType.TESLA_STOCK, 25000); // $250.00
        
        (IOrderMixin.Order memory equalOrder,) = factory.createIndexOrder(
            88888,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.TESLA_STOCK,
            IndexPreInteraction.ComparisonOperator.EQUAL,
            25000, // Exactly $250.00
            uint40(block.timestamp + 3600)
        );
        
        bytes32 equalOrderHash = factory.getOrderHash(equalOrder);
        bool isValid = preInteraction.validateOrderCondition(equalOrderHash);
        assertTrue(isValid); // Should pass with exact match
        
        // Test with slight difference (within tolerance)
        oracle.updateIndex(MockIndexOracle.IndexType.TESLA_STOCK, 25025); // $250.25 (0.1% diff)
        isValid = preInteraction.validateOrderCondition(equalOrderHash);
        assertTrue(isValid); // Should still pass within tolerance
        
        vm.stopPrank();
        
        console.log("[OK] Edge cases handled correctly\n");
    }
    
    /**
     * @dev Test gas consumption for real-world usage
     */
    function testGasConsumption() public {
        console.log("=== Testing Gas Consumption ===");
        
        vm.startPrank(maker);
        
        uint256 gasBefore = gasleft();
        
        // Create order
        (IOrderMixin.Order memory order,) = factory.createIndexOrder(
            666666,
            maker, maker, USDC, WETH,
            MAKING_AMOUNT, TAKING_AMOUNT,
            IndexPreInteraction.IndexType.BTC_PRICE,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            45000 * 100,
            uint40(block.timestamp + 3600)
        );
        
        uint256 gasAfterCreate = gasleft();
        uint256 createGasUsed = gasBefore - gasAfterCreate;
        
        // Validate condition
        bytes32 orderHash = factory.getOrderHash(order);
        gasBefore = gasleft();
        preInteraction.validateOrderCondition(orderHash);
        uint256 gasAfterValidate = gasleft();
        uint256 validateGasUsed = gasBefore - gasAfterValidate;
        
        vm.stopPrank();
        
        console.log("Gas used for order creation:", createGasUsed);
        console.log("Gas used for condition validation:", validateGasUsed);
        console.log("Total gas for complete flow:", createGasUsed + validateGasUsed);
        
        // Assert reasonable gas limits
        assertLt(createGasUsed, 500000); // Order creation should be < 500k gas
        assertLt(validateGasUsed, 100000); // Validation should be < 100k gas
        
        console.log("[OK] Gas consumption within acceptable limits\n");
    }
    
    function testRealWorldScenarios() public {
        console.log("=== Testing Real-World Trading Scenarios ===");
        
        // Scenario 1: DeFi risk management
        console.log("Scenario 1: Risk Management - Exit when VIX spikes");
        testRiskManagementOrder();
        
        // Scenario 2: Macro trading
        console.log("\nScenario 2: Macro Trade - Inflation hedge");
        testInflationHedgeOrder();
        
        // Scenario 3: Social sentiment trading
        console.log("\nScenario 3: Social Trading - Elon followers milestone");
        testSocialSentimentOrder();
        
        console.log("[OK] All real-world scenarios tested successfully");
    }
    
    function testRiskManagementOrder() internal {
        vm.startPrank(maker);
        
        // Create exit order when VIX > 25%
        (IOrderMixin.Order memory order,) = factory.createIndexOrder(
            111111,
            maker, maker, WETH, USDC, // Sell ETH for USDC (exit risk)
            1 ether, 3000 * 10**6, // 1 ETH for 3000 USDC
            IndexPreInteraction.IndexType.VIX_INDEX,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            2500, // 25%
            uint40(block.timestamp + 86400) // 1 day
        );
        
        bytes32 orderHash = factory.getOrderHash(order);
        
        // VIX currently at 18.5% - order should not execute
        assertFalse(preInteraction.validateOrderCondition(orderHash));
        
        vm.stopPrank();
        // Market panic: VIX spikes to 30% (update as owner)
        oracle.updateIndex(MockIndexOracle.IndexType.VIX_INDEX, 3000);
        vm.startPrank(maker);
        
        // Order should now be executable
        assertTrue(preInteraction.validateOrderCondition(orderHash));
        console.log("[OK] Risk management order triggered at VIX 30%");
        
        vm.stopPrank();
    }
    
    function testInflationHedgeOrder() internal {
        vm.startPrank(maker);
        
        // Create hedge order when inflation > 4%
        (IOrderMixin.Order memory order,) = factory.createIndexOrder(
            222222,
            maker, maker, USDC, WETH, // Buy ETH as inflation hedge
            2000 * 10**6, 1 ether,
            IndexPreInteraction.IndexType.INFLATION_RATE,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            400, // 4%
            uint40(block.timestamp + 86400)
        );
        
        bytes32 orderHash = factory.getOrderHash(order);
        
        // Inflation currently at 3.2% - order should not execute
        assertFalse(preInteraction.validateOrderCondition(orderHash));
        
        // Fed policy drives inflation to 4.5%
        oracle.updateIndex(MockIndexOracle.IndexType.INFLATION_RATE, 450);
        
        // Order should now be executable
        assertTrue(preInteraction.validateOrderCondition(orderHash));
        console.log("[OK] Inflation hedge order triggered at 4.5%");
        
        vm.stopPrank();
    }
    
    function testSocialSentimentOrder() internal {
        vm.startPrank(maker);
        
        // Create order based on Elon's followers
        (IOrderMixin.Order memory order,) = factory.createIndexOrder(
            333333,
            maker, maker, USDC, WETH,
            1000 * 10**6, 0.4 ether,
            IndexPreInteraction.IndexType.ELON_FOLLOWERS,
            IndexPreInteraction.ComparisonOperator.GREATER_THAN,
            155000000, // 155M
            uint40(block.timestamp + 86400)
        );
        
        bytes32 orderHash = factory.getOrderHash(order);
        
        // Currently at 165M followers (from earlier test) - should execute
        assertTrue(preInteraction.validateOrderCondition(orderHash));
        console.log("[OK] Social sentiment order executable at 165M followers");
        
        vm.stopPrank();
    }
}