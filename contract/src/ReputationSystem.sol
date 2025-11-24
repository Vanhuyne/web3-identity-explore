// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReputationSystem {
    
    struct Note {
        address reviewer;
        string message;
        uint8 score;      // Giả sử thang điểm 1-5
        uint256 timestamp;
    }

    mapping(address => Note[]) public notes;
    
    // Logic 1: Biến để tính trung bình
    mapping(address => uint256) public totalScore;
    mapping(address => uint256) public reviewCount;

    // Logic 2: Chống Spam (Mỗi người chỉ được review 1 ví 1 lần)
    mapping(address => mapping(address => bool)) public hasReviewed;

    event NoteAdded(address indexed target, address indexed reviewer, uint8 score);

    function addNote(address _target, string memory _message, uint8 _score) public {
        // Validate đầu vào
        require(_score >= 1 && _score <= 5, "Score must be between 1 and 5");
        require(msg.sender != _target, "Cannot review yourself"); // Không tự sướng
        
        // LOGIC 2: Ngăn đánh giá lại (Anti-Spam)
        require(!hasReviewed[_target][msg.sender], "You have already reviewed this wallet");

        // Tạo Note mới
        notes[_target].push(Note({
            reviewer: msg.sender,
            message: _message,
            score: _score,
            timestamp: block.timestamp
        }));

        // LOGIC 1: Cập nhật dữ liệu để tính trung bình
        totalScore[_target] += _score;
        reviewCount[_target] += 1;

        // Đánh dấu là đã review
        hasReviewed[_target][msg.sender] = true;

        emit NoteAdded(_target, msg.sender, _score);
    }
}