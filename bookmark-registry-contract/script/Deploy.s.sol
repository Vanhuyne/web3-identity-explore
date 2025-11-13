// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Web3BookmarkRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Web3BookmarkRegistry registry = new Web3BookmarkRegistry();
        
        console.log("Web3BookmarkRegistry deployed to:", address(registry));
        
        vm.stopBroadcast();
    }
}