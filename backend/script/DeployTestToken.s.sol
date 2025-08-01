// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/TestToken.sol";

contract DeployTestToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy TestUSDC with 6 decimals like real USDC
        TestToken testUSDC = new TestToken(
            "Test USDC",
            "tUSDC", 
            6,
            1000000 // 1M total supply
        );

        console.log("TestUSDC deployed at:", address(testUSDC));
        console.log("Total supply:", testUSDC.totalSupply() / 10**6, "tUSDC");

        vm.stopBroadcast();
    }
}