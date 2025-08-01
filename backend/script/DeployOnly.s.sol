// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockIndexOracle.sol";
import "../contracts/IndexPreInteraction.sol";
import "../contracts/IndexLimitOrderFactory.sol";

/**
 * @title DeployOnly
 * @notice Simple deployment script for production - no testing logic
 */
contract DeployOnly is Script {
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Deploying to Base Sepolia ===");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy MockIndexOracle
        console.log("Deploying MockIndexOracle...");
        MockIndexOracle oracle = new MockIndexOracle();
        console.log("MockIndexOracle deployed:", address(oracle));
        
        // Deploy IndexPreInteraction  
        console.log("Deploying IndexPreInteraction...");
        IndexPreInteraction preInteraction = new IndexPreInteraction(address(oracle));
        console.log("IndexPreInteraction deployed:", address(preInteraction));
        
        // Deploy IndexLimitOrderFactory
        console.log("Deploying IndexLimitOrderFactory...");
        IndexLimitOrderFactory factory = new IndexLimitOrderFactory(preInteraction);
        console.log("IndexLimitOrderFactory deployed:", address(factory));
        
        // Initialize oracle with test data
        console.log("Initializing oracle...");
        oracle.updateIndex(MockIndexOracle.IndexType.BTC_PRICE, 43000 * 100);      // $43,000
        oracle.updateIndex(MockIndexOracle.IndexType.ELON_FOLLOWERS, 150000000);   // 150M
        oracle.updateIndex(MockIndexOracle.IndexType.INFLATION_RATE, 320);         // 3.20%
        oracle.updateIndex(MockIndexOracle.IndexType.VIX_INDEX, 1850);             // 18.50
        oracle.updateIndex(MockIndexOracle.IndexType.UNEMPLOYMENT_RATE, 370);      // 3.70%
        oracle.updateIndex(MockIndexOracle.IndexType.TESLA_STOCK, 248 * 100);      // $248
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("MockIndexOracle:        ", address(oracle));
        console.log("IndexPreInteraction:    ", address(preInteraction));
        console.log("IndexLimitOrderFactory: ", address(factory));
        console.log("\nSave these addresses and update your web3_workflow.js!");
    }
}