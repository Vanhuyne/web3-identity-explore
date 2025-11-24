// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Web3BookmarkRegistry.sol";

contract Web3BookmarkRegistryTest is Test {
    Web3BookmarkRegistry public registry;
    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {
        registry = new Web3BookmarkRegistry();
    }

    function testAddBookmark() public {
        vm.prank(user1);
        registry.addBookmark(
            "farcaster",
            "testuser",
            "https://avatar.com/test.jpg",
            "https://farcaster.xyz/testuser"
        );

        (
            string memory platform,
            string memory username,
            ,
            ,
            ,
            bool exists
        ) = registry.getBookmark(user1, "farcaster");

        assertEq(exists, true);
        assertEq(platform, "farcaster");
        assertEq(username, "testuser");
    }

    function testRemoveBookmark() public {
        vm.startPrank(user1);
        registry.addBookmark("farcaster", "testuser", "", "");
        registry.removeBookmark("farcaster");
        vm.stopPrank();

        (, , , , , bool exists) = registry.getBookmark(user1, "farcaster");
        assertEq(exists, false);
    }

    function testGetBookmarkCount() public {
        vm.startPrank(user1);
        registry.addBookmark("farcaster", "user1", "", "");
        registry.addBookmark("lens", "user2", "", "");
        vm.stopPrank();

        uint256 count = registry.getBookmarkCount(user1);
        assertEq(count, 2);
    }

    function testRevertWhenEmptyUsername() public {
        vm.prank(user1);
        vm.expectRevert("Username cannot be empty");
        registry.addBookmark("farcaster", "", "", "");
    }
}