# Web3 Identity Explorer

A decentralized application for exploring and bookmarking Web3 identities across multiple platforms including Farcaster, ENS, Twitter, GitHub, Zora, and Lens.

## Overview

Web3 Identity Explorer allows users to search for Web3 identities and bookmark their favorite profiles on-chain. The application integrates with multiple Web3 platforms and stores bookmarks in a smart contract deployed on Base network.

## Features

- 🔍 **Multi-platform Search**: Search for identities across Farcaster, ENS, Twitter, GitHub, Zora, and Lens
- 🔖 **On-chain Bookmarks**: Store your bookmarks permanently on the blockchain
- 🔗 **Cross-platform Identity Resolution**: Discover all linked identities for a given profile
- 💼 **Wallet Integration**: Connect with various wallets using Reown AppKit
- 📱 **Farcaster Mini App**: Optimized for Farcaster Frame integration
- 🎨 **Modern UI**: Clean, responsive interface with Tailwind CSS

## Tech Stack

### Frontend
- **Angular 18**: Modern web framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **RxJS**: Reactive programming

### Web3 Integration
- **Reown AppKit**: Wallet connection
- **Viem**: Ethereum interaction library
- **Wagmi**: React hooks for Ethereum

### Smart Contracts
- **Solidity 0.8.20**: Smart contract language
- **Foundry**: Development framework
- **Forge**: Testing framework

### APIs
- **Memory API**: Identity resolution service

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── home-component/          # Main landing page
│   │   │   ├── bookmarks-views/         # Bookmarks management
│   │   │   ├── search-bar-component/    # Search interface
│   │   │   ├── search-results/          # Results display
│   │   │   └── wallet-connect/          # Wallet connection
│   │   ├── services/
│   │   │   ├── identity-service.ts      # Identity search logic
│   │   │   ├── bookmark-service.ts      # Bookmark management
│   │   │   └── memory-api-service.ts    # API integration
│   │   ├── models/                      # TypeScript interfaces
│   │   └── config/
│   │       └── wallet.config.ts         # Wallet configuration
│   └── index.html
├── bookmark-registry-contract/
│   ├── src/
│   │   └── Web3BookmarkRegistry.sol     # Main contract
│   ├── script/
│   │   └── Deploy.s.sol                 # Deployment script
│   └── test/                            # Contract tests
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Angular CLI: `npm install -g @angular/cli`
- Foundry (for smart contract development)

### Frontend Setup

1. Clone the repository:
```bash
git clone https://github.com/Vanhuyne/web3-identity-explorer.git
cd web3-identity-explorer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory (if needed for API keys)

4. Start the development server:
```bash
npm start
```

Navigate to `http://localhost:4200/`

### Smart Contract Setup

1. Navigate to the contract directory:
```bash
cd bookmark-registry-contract
```

2. Install dependencies:
```bash
forge install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Add your PRIVATE_KEY and RPC URLs
```

4. Compile contracts:
```bash
forge build
```

5. Run tests:
```bash
forge test
```

6. Deploy (example for Base Sepolia):
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url $BASE_SEPOLIA_RPC --broadcast --verify
```

## Smart Contract

### Web3BookmarkRegistry

The main contract that stores user bookmarks on-chain.

**Key Functions:**

- `addBookmark`: Store a new bookmark
- `removeBookmark`: Remove an existing bookmark
- `getBookmark`: Retrieve a specific bookmark
- `getUserPlatforms`: Get all platforms a user has bookmarked
- `getAllBookmarks`: Get all bookmarks for a user

**Deployed Addresses:**
- Base Mainnet: `0xYourContractAddress`
- Base Sepolia: `0xYourTestnetAddress`

## How to Use

1. **Connect Wallet**: Click the wallet connect button and select your preferred wallet

2. **Search for Identities**: 
   - Enter a wallet address (0x...)
   - Enter a Farcaster username or FID
   - Enter a Twitter handle (@username)
   - Enter an ENS name

3. **View Results**: Browse through discovered identities across all platforms

4. **Bookmark Profiles**: Click the bookmark icon to save profiles on-chain

5. **Manage Bookmarks**: View and manage your bookmarks in the Bookmarks page

## API Integration

The app uses the Memory API for identity resolution. Configure the API endpoint in `src/app/services/memory-api-service.ts`.

## Building for Production

```bash
ng build --configuration production
```

Build artifacts will be stored in the `dist/` directory.

## Testing

### Frontend Tests
```bash
npm test
```

### Contract Tests
```bash
cd bookmark-registry-contract
forge test -vvv
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Farcaster Mini App

This app is optimized for use as a Farcaster Mini App. The metadata is configured in `src/index.html`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Angular](https://angular.dev)
- Smart contracts powered by [Foundry](https://book.getfoundry.sh/)
- Wallet integration by [Reown](https://reown.com/)
- Identity data from Memory API

## Support

For support, please open an issue in the GitHub repository or reach out to the maintainers.

## Roadmap

- [ ] Add support for more Web3 platforms
- [ ] Implement bookmark sharing functionality
- [ ] Add reputation system integration
- [ ] Mobile app development
- [ ] Cross-chain bookmark synchronization

---

Built with ❤️ by the Web3 Identity Explorer team
