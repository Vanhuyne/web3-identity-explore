import { Injectable } from '@angular/core';
import { createPublicClient, createWalletClient, custom,  http } from 'viem';
import { base, sepolia } from 'viem/chains';
import { CONTRACT_ADDRESS, REPUTATION_ABI } from '../web3/reputation.config';
import { appKit } from '../config/wallet.config';
// import { appKit } from '../config/wallet.config';

@Injectable({
  providedIn: 'root'
})
export class ReputationService{
  // 1. Client for reading data (Public)
  private publicClient = createPublicClient({
    chain: base, // Change this to your chain
    transport: http()
  });

  constructor() {
  }

  // --- READ FUNCTIONS ---

  async getAverageScore(targetAddress: string): Promise<number> {
    const data = await this.publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: REPUTATION_ABI,
      functionName: 'getAverageScore',
      args: [targetAddress as `0x${string}`]
    });
    
    // Logic note: Your contract returns value * 100. 
    // Example: 450 means 4.5. We convert it here.
    return Number(data) / 100;
  }

  async getReviewCount(targetAddress: string): Promise<number> {
    const count = await this.publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: REPUTATION_ABI,
      functionName: 'reviewCount',
      args: [targetAddress as `0x${string}`]
    });
    return Number(count);
  }

  // Helper to fetch all notes (Looping because mapping stores arrays)
  async getAllNotes(targetAddress: string) {
    const count = await this.getReviewCount(targetAddress);
    const notes = [];

    // Loop through indexes to fetch struct data
    for (let i = 0; i < count; i++) {
      const noteData = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: REPUTATION_ABI,
        functionName: 'notes',
        args: [targetAddress as `0x${string}`, BigInt(i)]
      });
      
      // Viem returns struct as array/object based on ABI
      notes.push({
        reviewer: noteData[0],
        message: noteData[1],
        score: noteData[2],
        timestamp: new Date(Number(noteData[3]) * 1000) // Convert Unix timestamp
      });
    }
    console.log(notes);
    return notes;
  }

  // --- WRITE FUNCTIONS ---

 async addNote(targetAddress: string, message: string, score: number) {
    // 1. Get the Provider from AppKit
    const provider = appKit.getProvider('eip155');
    
    if (!provider) {
      throw new Error("Wallet not connected via AppKit");
    }
    // 2. Ensure provider has the request method (type assertion)
    const ethereumProvider = provider as any;
    
    if (typeof ethereumProvider.request !== 'function') {
      throw new Error("Provider does not support EIP-1193 request method");
    }

    // 3. Create a temporary WalletClient using that provider
    const walletClient = createWalletClient({
      chain: base,
      transport: custom(ethereumProvider)
    });

    // 4. Get the active address from AppKit
    const account = appKit.getAccount();

    if (!account) {
      throw new Error("No account found");
    }

    // 4. Send Transaction
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: REPUTATION_ABI,
      functionName: 'addNote',
      args: [targetAddress as `0x${string}`, message, score],
      account: account.address as `0x${string}`
    });

    // 5. Wait for confirmation using the Public Client
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  }
}
