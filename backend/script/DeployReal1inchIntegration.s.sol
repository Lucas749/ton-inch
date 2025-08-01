// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/Real1inchOrderManager.sol";

contract DeployReal1inchIntegration is Script {
    
    // Real 1inch protocol on Base Sepolia
    address constant REAL_1INCH_PROTOCOL = 0xE53136D9De56672e8D2665C98653AC7b8A60Dc44;
    
    // Our existing contracts (update these with current deployed addresses)
    address constant INDEX_PRE_INTERACTION = 0x8AF8db923E96A6709Ae339d1bFb9E986410D8461;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Deploying Real 1inch Integration ===");
        console.log("Network: Base Sepolia");
        console.log("Real 1inch Protocol:", REAL_1INCH_PROTOCOL);
        console.log("PreInteraction Contract:", INDEX_PRE_INTERACTION);
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        // Deploy Real1inchOrderManager
        Real1inchOrderManager orderManager = new Real1inchOrderManager(
            REAL_1INCH_PROTOCOL,
            INDEX_PRE_INTERACTION
        );

        console.log("\nDeployed Contracts:");
        console.log("Real1inchOrderManager:", address(orderManager));
        
        console.log("\n[OK] Real 1inch integration deployed successfully!");
        console.log("\nUpdate your JavaScript config with:");
        console.log("Real1inchOrderManager:", address(orderManager));

        vm.stopBroadcast();
    }
}