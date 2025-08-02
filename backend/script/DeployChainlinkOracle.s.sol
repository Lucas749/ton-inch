// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console} from "forge-std/Script.sol";
import "../contracts/ChainlinkIndexOracle.sol";

/**
 * @title Deploy Chainlink Index Oracle
 * @notice Deploys the ChainlinkIndexOracle contract to Base mainnet
 * 
 * Usage:
 * forge script script/DeployChainlinkOracle.s.sol:DeployChainlinkOracle --rpc-url $RPC_URL --broadcast --verify -vvvv
 */
contract DeployChainlinkOracle is Script {
    
    // Base mainnet Chainlink Functions subscription ID (you need to create this)
    uint64 constant SUBSCRIPTION_ID = 1; // Replace with your actual subscription ID
    
    // Default source code for basic price fetching
    string constant DEFAULT_SOURCE = 
        "const apiResponse = await Functions.makeHttpRequest({"
        "url: args[0]"
        "});"
        "if (apiResponse.error) {"
        "throw Error('Request failed');"
        "}"
        "const { data } = apiResponse;"
        "const value = Math.round(parseFloat(data.price) * 100);"
        "return Functions.encodeUint256(value);";

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying ChainlinkIndexOracle...");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Subscription ID:", SUBSCRIPTION_ID);
        
        ChainlinkIndexOracle oracle = new ChainlinkIndexOracle(
            SUBSCRIPTION_ID,
            DEFAULT_SOURCE
        );
        
        console.log("ChainlinkIndexOracle deployed to:", address(oracle));
        console.log("Owner:", oracle.owner());
        console.log("Subscription ID:", oracle.subscriptionId());
        console.log("Total Indices:", oracle.getTotalIndices());
        
        // Verify the deployment
        (uint256 vixValue, uint256 vixTimestamp, string memory vixUrl, bool vixActive) = oracle.getIndexValue(0);
        console.log("VIX Index (ID 0):");
        console.log("  Value:", vixValue);
        console.log("  Timestamp:", vixTimestamp);
        console.log("  Source URL:", vixUrl);
        console.log("  Active:", vixActive);
        
        vm.stopBroadcast();
        
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Contract Address:", address(oracle));
        console.log("Next steps:");
        console.log("1. Add this contract as a consumer to your Chainlink Functions subscription");
        console.log("2. Fund the subscription with LINK tokens");
        console.log("3. Update the subscription ID if different from", SUBSCRIPTION_ID);
        console.log("4. Test with: oracle.updateIndex(0, '', ['https://api.example.com/vix'])");
    }
}