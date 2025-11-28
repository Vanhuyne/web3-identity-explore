import { Injectable } from '@angular/core';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { base, sepolia } from 'viem/chains';
import { CONTRACT_ADDRESS, REPUTATION_ABI } from '../web3/reputation.config';
import { appKit } from '../config/wallet.config';

interface Note {
  reviewer: string;
  message: string;
  score: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReputationService {
  private publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  constructor() {}

  // --- READ FUNCTIONS ---

  async getAverageScore(targetAddress: string): Promise<number> {
    try {
      const data = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: REPUTATION_ABI,
        functionName: 'getAverageScore',
        args: [targetAddress as `0x${string}`]
      });
      
      return Number(data) / 100;
    } catch (error) {
      console.error('Error fetching average score:', error);
      return 0;
    }
  }

  async getReviewCount(targetAddress: string): Promise<number> {
    try {
      const count = await this.publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: REPUTATION_ABI,
        functionName: 'reviewCount',
        args: [targetAddress as `0x${string}`]
      });
      return Number(count);
    } catch (error) {
      console.error('Error fetching review count:', error);
      return 0;
    }
  }

  // Helper to fetch all notes
  async getAllNotes(targetAddress: string): Promise<Note[]> {
    try {
      const count = await this.getReviewCount(targetAddress);
      
      if (count === 0) {
        return [];
      }

      const notes: Note[] = [];

      // Loop through indexes to fetch struct data
      for (let i = 0; i < count; i++) {
        try {
          const noteData = await this.publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: REPUTATION_ABI,
            functionName: 'notes',
            args: [targetAddress as `0x${string}`, BigInt(i)]
          });
          
          // Handle both array-style and object-style returns from Viem
          const note = this.parseNoteData(noteData);
          notes.push(note);
        } catch (error) {
          console.error(`Error fetching note at index ${i}:`, error);
          continue; // Skip this note and continue with next
        }
      }
      console.log(notes);
      
      return notes;
    } catch (error) {
      console.error('Error in getAllNotes:', error);
      return [];
    }
  }

  // Parse note data from contract response (handles both array and object formats)
  private parseNoteData(noteData: any): Note {
    let reviewer: string;
    let message: string;
    let score: number;
    let timestamp: Date;

    // Check if it's an object with named properties (typical Viem behavior with ABI)
    if (noteData && typeof noteData === 'object' && !Array.isArray(noteData)) {
      reviewer = noteData.reviewer || noteData[0] || '';
      message = noteData.message || noteData[1] || '';
      score = Number(noteData.score || noteData[2] || 0);
      timestamp = new Date(Number(noteData.timestamp || noteData[3] || 0) * 1000);
    } else if (Array.isArray(noteData)) {
      // Fallback to array access
      reviewer = noteData[0] || '';
      message = noteData[1] || '';
      score = Number(noteData[2] || 0);
      timestamp = new Date(Number(noteData[3] || 0) * 1000);
    } else {
      console.warn('Unexpected noteData format:', noteData);
      return {
        reviewer: '',
        message: '',
        score: 0,
        timestamp: new Date()
      };
    }

    return {
      reviewer,
      message,
      score,
      timestamp
    };
  }

  // --- WRITE FUNCTIONS ---

  async addNote(targetAddress: string, message: string, score: number): Promise<any> {
    try {
      // 1. Get the Provider from AppKit
      const provider = appKit.getProvider('eip155');
      
      if (!provider) {
        throw new Error("Wallet not connected via AppKit");
      }

      const ethereumProvider = provider as any;
      
      if (typeof ethereumProvider.request !== 'function') {
        throw new Error("Provider does not support EIP-1193 request method");
      }

      // 2. Create a temporary WalletClient using that provider
      const walletClient = createWalletClient({
        chain: base,
        transport: custom(ethereumProvider)
      });

      // 3. Get the active address from AppKit
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
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }
}