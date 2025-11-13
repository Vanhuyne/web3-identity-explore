// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Web3BookmarkRegistry
 * @dev Store and manage Web3 identity bookmarks onchain
 * @notice This contract allows users to bookmark Web3 profiles across different platforms
 */
contract Web3BookmarkRegistry {
    
    // Struct to store bookmark data
    struct Bookmark {
        string platform;      // e.g., "farcaster", "ens", "lens", "twitter"
        string username;      // Username or handle
        string avatar;        // Avatar URL (optional)
        string profileUrl;    // Profile URL
        uint256 timestamp;    // When bookmark was created
        bool exists;          // To check if bookmark exists
    }
    
    // Mapping: user address => platform => Bookmark
    mapping(address => mapping(string => Bookmark)) private userBookmarks;
    
    // Mapping: user address => list of platform names they've bookmarked
    mapping(address => string[]) private userPlatforms;
    
    // Events
    event BookmarkAdded(
        address indexed user,
        string platform,
        string username,
        uint256 timestamp
    );
    
    event BookmarkRemoved(
        address indexed user,
        string platform,
        uint256 timestamp
    );
    
    event BookmarkUpdated(
        address indexed user,
        string platform,
        string username,
        uint256 timestamp
    );
    
    /**
     * @dev Add or update a bookmark
     * @param _platform Platform name (e.g., "farcaster", "ens")
     * @param _username Username or handle
     * @param _avatar Avatar URL
     * @param _profileUrl Profile URL
     */
    function addBookmark(
        string memory _platform,
        string memory _username,
        string memory _avatar,
        string memory _profileUrl
    ) external {
        require(bytes(_platform).length > 0, "Platform cannot be empty");
        require(bytes(_username).length > 0, "Username cannot be empty");
        
        bool isUpdate = userBookmarks[msg.sender][_platform].exists;
        
        userBookmarks[msg.sender][_platform] = Bookmark({
            platform: _platform,
            username: _username,
            avatar: _avatar,
            profileUrl: _profileUrl,
            timestamp: block.timestamp,
            exists: true
        });
        
        // If new bookmark, add platform to user's list
        if (!isUpdate) {
            userPlatforms[msg.sender].push(_platform);
            emit BookmarkAdded(msg.sender, _platform, _username, block.timestamp);
        } else {
            emit BookmarkUpdated(msg.sender, _platform, _username, block.timestamp);
        }
    }
    
    /**
     * @dev Remove a bookmark
     * @param _platform Platform name to remove
     */
    function removeBookmark(string memory _platform) external {
        require(userBookmarks[msg.sender][_platform].exists, "Bookmark does not exist");
        
        // Delete the bookmark
        delete userBookmarks[msg.sender][_platform];
        
        // Remove platform from user's list
        _removePlatformFromList(msg.sender, _platform);
        
        emit BookmarkRemoved(msg.sender, _platform, block.timestamp);
    }
    
    /**
     * @dev Get a specific bookmark
     * @param _user User address
     * @param _platform Platform name
     * @return platform Platform name
     * @return username Username or handle
     * @return avatar Avatar URL (optional)
     * @return profileUrl Profile URL
     * @return timestamp When bookmark was created
     * @return exists True if bookmark exists
     */
    function getBookmark(address _user, string memory _platform) 
        external 
        view 
        returns (
            string memory platform,
            string memory username,
            string memory avatar,
            string memory profileUrl,
            uint256 timestamp,
            bool exists
        ) 
    {
        Bookmark memory bookmark = userBookmarks[_user][_platform];
        return (
            bookmark.platform,
            bookmark.username,
            bookmark.avatar,
            bookmark.profileUrl,
            bookmark.timestamp,
            bookmark.exists
        );
    }
    
    /**
     * @dev Get all bookmarked platforms for a user
     * @param _user User address
     * @return Array of platform names
     */
    function getUserPlatforms(address _user) external view returns (string[] memory) {
        return userPlatforms[_user];
    }
    
    /**
     * @dev Get all bookmarks for a user
     * @param _user User address
     * @return Array of all bookmarks
     */
    function getAllBookmarks(address _user) external view returns (Bookmark[] memory) {
        string[] memory platforms = userPlatforms[_user];
        Bookmark[] memory bookmarks = new Bookmark[](platforms.length);
        
        for (uint256 i = 0; i < platforms.length; i++) {
            bookmarks[i] = userBookmarks[_user][platforms[i]];
        }
        
        return bookmarks;
    }
    
    /**
     * @dev Get bookmark count for a user
     * @param _user User address
     * @return Number of bookmarks
     */
    function getBookmarkCount(address _user) external view returns (uint256) {
        return userPlatforms[_user].length;
    }
    
    /**
     * @dev Check if a platform is bookmarked
     * @param _user User address
     * @param _platform Platform name
     * @return True if bookmarked
     */
    function isBookmarked(address _user, string memory _platform) external view returns (bool) {
        return userBookmarks[_user][_platform].exists;
    }
    
    /**
     * @dev Clear all bookmarks for the sender
     */
    function clearAllBookmarks() external {
        string[] memory platforms = userPlatforms[msg.sender];
        
        for (uint256 i = 0; i < platforms.length; i++) {
            delete userBookmarks[msg.sender][platforms[i]];
        }
        
        delete userPlatforms[msg.sender];
        
        emit BookmarkRemoved(msg.sender, "all", block.timestamp);
    }
    
    /**
     * @dev Internal function to remove platform from user's list
     * @param _user User address
     * @param _platform Platform to remove
     */
    function _removePlatformFromList(address _user, string memory _platform) private {
        string[] storage platforms = userPlatforms[_user];
        
        for (uint256 i = 0; i < platforms.length; i++) {
            if (keccak256(bytes(platforms[i])) == keccak256(bytes(_platform))) {
                // Move last element to this position and pop
                platforms[i] = platforms[platforms.length - 1];
                platforms.pop();
                break;
            }
        }
    }
}