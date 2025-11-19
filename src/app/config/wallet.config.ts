import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, baseSepolia, arbitrum, base } from 'viem/chains';


const projectId = 'be63c666d855988f759d93e4eb2e2795'

export const networks = [ base, arbitrum, mainnet];

// 2. Set up Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

// 3. Configure the metadata
const metadata = {
  name: 'Web3 Identity Finder',
  description: 'Web3 Identity Finder',
  url: 'https://web3-identity-find.vercel.app/', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}


export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [base, arbitrum, mainnet],
  metadata,
  projectId,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
});


