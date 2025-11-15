import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, baseSepolia, arbitrum, base } from 'viem/chains';


const projectId = 'be63c666d855988f759d93e4eb2e2795'

export const networks = [baseSepolia]

// 2. Set up Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

// 3. Configure the metadata
const metadata = {
  name: 'AppKit',
  description: 'AppKit Example',
  url: 'https://example.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}


export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [baseSepolia],
  metadata,
  projectId,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
});


