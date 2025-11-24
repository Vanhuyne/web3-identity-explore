// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Đường dẫn này giả định contract của bạn nằm ở src/ReputationSystem.sol
import "forge-std/Script.sol";
import {ReputationSystem} from "../src/ReputationSystem.sol";

contract ReputationSystemScript is Script {
    function run() public returns (ReputationSystem) {
        // vm.startBroadcast() tự động lấy Private Key từ biến môi trường 
        // để ký giao dịch (đã setup trong file .env).
        // uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast();

        // Khởi tạo và triển khai contract
        ReputationSystem rs = new ReputationSystem();

        // Dừng quá trình broadcast
        vm.stopBroadcast();
        
        // In địa chỉ contract đã deploy ra console
        console.log("Contract deployed to:", address(rs));

        // Trả về địa chỉ để các scripts khác có thể sử dụng (nếu cần)
        return rs;
    }
}