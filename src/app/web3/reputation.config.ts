export const CONTRACT_ADDRESS = '0x39b8B6e76d0f3027430Ff53381Aa16081b9B00aF'; // REPLACE with your deployed contract address

export const REPUTATION_ABI = [
  {
    "type": "function",
    "name": "addNote",
    "inputs": [
      { "name": "_target", "type": "address" },
      { "name": "_message", "type": "string" },
      { "name": "_score", "type": "uint8" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAverageScore",
    "inputs": [{ "name": "_target", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "reviewCount",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "notes",
    "inputs": [
      { "name": "", "type": "address" },
      { "name": "", "type": "uint256" }
    ],
    "outputs": [
      { "name": "reviewer", "type": "address" },
      { "name": "message", "type": "string" },
      { "name": "score", "type": "uint8" },
      { "name": "timestamp", "type": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasReviewed",
    "inputs": [
      { "name": "", "type": "address" },
      { "name": "", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "NoteAdded",
    "inputs": [
      { "name": "target", "type": "address", "indexed": true },
      { "name": "reviewer", "type": "address", "indexed": true },
      { "name": "score", "type": "uint8", "indexed": false }
    ],
    "anonymous": false
  }
] as const;