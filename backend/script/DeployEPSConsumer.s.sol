// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/EPSConsumer.sol";

contract DeployEPSConsumer is Script {
    
    // Subscription ID loaded from environment
    uint64 SUBSCRIPTION_ID;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        SUBSCRIPTION_ID = uint64(vm.envUint("CHAINLINK_SUBSCRIPTION_ID"));
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the EPS Consumer contract
        EPSConsumer epsConsumer = new EPSConsumer(SUBSCRIPTION_ID);

        console.log("EPSConsumer deployed to:", address(epsConsumer));
        console.log("Subscription ID:", SUBSCRIPTION_ID);
        console.log("Owner:", epsConsumer.owner());

        vm.stopBroadcast();
    }
}