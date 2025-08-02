// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/MockIndexOracle.sol";

/**
 * @title DeployMockOracle
 * @notice Deploy MockIndexOracle contract for index-based predicates
 * @dev Simple deployment script for the oracle contract only
 */
contract DeployMockOracle is Script {
    
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying MockIndexOracle to Base Mainnet...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        
        // Deploy MockIndexOracle
        MockIndexOracle oracle = new MockIndexOracle();
        
        console.log("MockIndexOracle deployed at:", address(oracle));
        
        // Log current mock values for verification
        console.log("Verification - Current mock values:");
        (uint256 appleValue, uint256 appleTimestamp) = oracle.getIndexValue(0); // APPLE
        (uint256 teslaValue, uint256 teslaTimestamp) = oracle.getIndexValue(5); // TESLA
        (uint256 vixValue, uint256 vixTimestamp) = oracle.getIndexValue(3); // VIX
        
        console.log("APPLE Stock (ID 0):", appleValue, "timestamp:", appleTimestamp);
        console.log("TESLA Stock (ID 5):", teslaValue, "timestamp:", teslaTimestamp);
        console.log("VIX Index (ID 3):", vixValue, "timestamp:", vixTimestamp);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("MockIndexOracle Address:", address(oracle));
        console.log("");
        console.log("Next steps:");
        console.log("1. Set environment variable:");
        console.log("   export INDEX_ORACLE_ADDRESS=%s", address(oracle));
        console.log("2. Test predicates:");
        console.log("   ONEINCH_API_KEY=xxx INDEX_ORACLE_ADDRESS=%s npm run index-trading", address(oracle));
        console.log("");
        console.log("Predicates will now work for index conditions!");
    }
}