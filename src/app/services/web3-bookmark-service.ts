import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { celoAlfajores } from 'viem/chains';

export interface BookmarkedProfile {
  platform: string;
  username: string;
  avatar?: string;
  url: string;
  bookmarkedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class Web3BookmarkService {
   // Contract Configuration
  private readonly CONTRACT_ADDRESS = '0x7CC4d42892A048DcCD337fd73D8f4849C52CDBf6'; // Replace with your deployed contract
  private readonly CELO_ALFAJORES_RPC = 'https://forno.celo-sepolia.celo-testnet.org';

// Contract ABI
  private readonly CONTRACT_ABI = [
    {
      name: 'addBookmark',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: '_platform', type: 'string' },
        { name: '_username', type: 'string' },
        { name: '_avatar', type: 'string' },
        { name: '_profileUrl', type: 'string' }
      ],
      outputs: []
    },
    {
      name: 'removeBookmark',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: '_platform', type: 'string' }],
      outputs: []
    },
    {
      name: 'getBookmark',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: '_user', type: 'address' },
        { name: '_platform', type: 'string' }
      ],
      outputs: [
        { name: 'platform', type: 'string' },
        { name: 'username', type: 'string' },
        { name: 'avatar', type: 'string' },
        { name: 'profileUrl', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'exists', type: 'bool' }
      ]
    },
    {
      name: 'getAllBookmarks',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: '_user', type: 'address' }],
      outputs: [
        {
          name: '',
          type: 'tuple[]',
          components: [
            { name: 'platform', type: 'string' },
            { name: 'username', type: 'string' },
            { name: 'avatar', type: 'string' },
            { name: 'profileUrl', type: 'string' },
            { name: 'timestamp', type: 'uint256' },
            { name: 'exists', type: 'bool' }
          ]
        }
      ]
    },
    {
      name: 'getUserPlatforms',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: '_user', type: 'address' }],
      outputs: [{ name: '', type: 'string[]' }]
    },
    {
      name: 'getBookmarkCount',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: '_user', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    },
    {
      name: 'isBookmarked',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: '_user', type: 'address' },
        { name: '_platform', type: 'string' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    },
    {
      name: 'clearAllBookmarks',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [],
      outputs: []
    }
  ] as const;

  // State management
  private bookmarksSubject = new BehaviorSubject<BookmarkedProfile[]>([]);
  public bookmarks$: Observable<BookmarkedProfile[]> = this.bookmarksSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$: Observable<string | null> = this.errorSubject.asObservable();

  // Viem clients
  private publicClient: any = null;
  private walletClient: any = null;

  // Current connected address
  private currentAddress: `0x${string}` | null = null;

  constructor() {
    this.initializePublicClient();
  }

  /**
   * Initialize public client for read-only operations
   */
  private initializePublicClient(): void {
    try {
      this.publicClient = createPublicClient({
        chain: celoAlfajores,
        transport: http()
      });
    } catch (error) {
      console.error('Error initializing public client:', error);
    }
  }

  /**
   * Initialize with connected wallet (call this when appKit connects)
   */
  async initializeWithWallet(address: string): Promise<void> {
    if (!address) {
      console.error('No address provided');
      return;
    }

    try {
      this.loadingSubject.next(true);
      this.currentAddress = address as `0x${string}`;

      // Check if ethereum provider exists (injected by wallet)
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Ethereum provider not found');
      }

      // Initialize wallet client
      // this.walletClient = createWalletClient({
      //   chain: celoAlfajores,
      //   transport: custom(window.ethereum)
      // });

      // Load user's bookmarks
      await this.loadBookmarksFromContract(this.currentAddress);

      console.log('Web3 initialized successfully for address:', address);
    } catch (error: any) {
      console.error('Error initializing Web3:', error);
      this.errorSubject.next(error.message || 'Failed to initialize Web3');
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Clean up when wallet is disconnected
   */
  cleanup(): void {
    this.walletClient = null;
    this.currentAddress = null;
    this.bookmarksSubject.next([]);
    this.errorSubject.next(null);
  }

  /**
   * Load bookmarks from smart contract
   */
  private async loadBookmarksFromContract(address: `0x${string}`): Promise<void> {
    try {
      this.loadingSubject.next(true);

      if (!this.publicClient) {
        throw new Error('Public client not initialized');
      }

      const bookmarksData = await this.publicClient.readContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'getAllBookmarks',
        args: [address]
      }) as any[];

      const bookmarks: BookmarkedProfile[] = bookmarksData.map((b: any) => ({
        platform: b.platform,
        username: b.username,
        avatar: b.avatar || undefined,
        url: b.profileUrl,
        bookmarkedAt: Number(b.timestamp) * 1000
      }));

      this.bookmarksSubject.next(bookmarks);
      this.errorSubject.next(null);

      // log bookmarks
      console.log('Loaded bookmarks for address', address, bookmarks);
    } catch (error: any) {
      console.error('Error loading bookmarks from contract:', error);
      this.errorSubject.next(error.message || 'Failed to load bookmarks');
      // Don't throw, just log - allow app to continue
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Refresh bookmarks for current user
   */
  async refreshBookmarks(): Promise<void> {
    if (this.currentAddress) {
      await this.loadBookmarksFromContract(this.currentAddress);
    }
  }

  /**
   * Add a bookmark to the blockchain
   */
  async addBookmark(platform: string, profile: any): Promise<void> {
    if (!this.walletClient || !this.currentAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      const username = profile.username || profile.handle || 'Unknown';
      const avatar = profile.avatar || '';
      const url = profile.url || '';

      // Check if already bookmarked
      if (this.publicClient) {
        const isBookmarked = await this.publicClient.readContract({
          address: this.CONTRACT_ADDRESS,
          abi: this.CONTRACT_ABI,
          functionName: 'isBookmarked',
          args: [this.currentAddress, platform]
        });

        if (isBookmarked) {
          throw new Error(`${platform} is already bookmarked`);
        }
      }

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'addBookmark',
        args: [platform, username, avatar, url],
        account: this.currentAddress,
        chain: celoAlfajores
      });

      console.log('Transaction sent:', hash);

      // Wait for confirmation
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log('Transaction confirmed:', receipt.transactionHash);
      }

      // Reload bookmarks
      await this.loadBookmarksFromContract(this.currentAddress);

    } catch (error: any) {
      console.error('Error adding bookmark:', error);
      const errorMessage = error.shortMessage || error.message || 'Failed to add bookmark';
      this.errorSubject.next(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Remove a bookmark from the blockchain
   */
  async removeBookmark(platform: string): Promise<void> {
    if (!this.walletClient || !this.currentAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'removeBookmark',
        args: [platform],
        account: this.currentAddress,
        chain: celoAlfajores
      });

      console.log('Transaction sent:', hash);

      // Wait for confirmation
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log('Transaction confirmed:', receipt.transactionHash);
      }

      // Reload bookmarks
      await this.loadBookmarksFromContract(this.currentAddress);

    } catch (error: any) {
      console.error('Error removing bookmark:', error);
      const errorMessage = error.shortMessage || error.message || 'Failed to remove bookmark';
      this.errorSubject.next(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Toggle bookmark (add if not exists, remove if exists)
   */
  async toggleBookmark(platform: string, profile: any): Promise<void> {
    const isBookmarked = await this.isBookmarked(platform);

    if (isBookmarked) {
      await this.removeBookmark(platform);
    } else {
      await this.addBookmark(platform, profile);
    }
  }

  /**
   * Check if a platform is bookmarked
   */
  async isBookmarked(platform: string): Promise<boolean> {
    if (!this.currentAddress || !this.publicClient) {
      return false;
    }

    try {
      const result = await this.publicClient.readContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'isBookmarked',
        args: [this.currentAddress, platform]
      });

      return result as boolean;
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Check if a platform is bookmarked (synchronous - checks local state)
   */
  isBookmarkedSync(platform: string): boolean {
    return this.bookmarksSubject.value.some(b => b.platform === platform);
  }

  /**
   * Get all bookmarks
   */
  getAllBookmarks(): BookmarkedProfile[] {
    return this.bookmarksSubject.value;
  }

  /**
   * Get bookmark by platform
   */
  getBookmark(platform: string): BookmarkedProfile | undefined {
    return this.bookmarksSubject.value.find(b => b.platform === platform);
  }

  /**
   * Clear all bookmarks
   */
  async clearAllBookmarks(): Promise<void> {
    if (!this.walletClient || !this.currentAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'clearAllBookmarks',
        account: this.currentAddress,
        chain: celoAlfajores
      });

      console.log('Transaction sent:', hash);

      // Wait for confirmation
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        console.log('Transaction confirmed:', receipt.transactionHash);
      }

      // Clear local state
      this.bookmarksSubject.next([]);

    } catch (error: any) {
      console.error('Error clearing bookmarks:', error);
      const errorMessage = error.shortMessage || error.message || 'Failed to clear bookmarks';
      this.errorSubject.next(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get bookmarks count
   */
  getBookmarksCount(): number {
    return this.bookmarksSubject.value.length;
  }

  /**
   * Get bookmarks for any address (read-only)
   */
  async getBookmarksForAddress(address: string): Promise<BookmarkedProfile[]> {
    try {
      if (!this.publicClient) {
        throw new Error('Public client not initialized');
      }

      const bookmarksData = await this.publicClient.readContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'getAllBookmarks',
        args: [address as `0x${string}`]
      }) as any[];

      return bookmarksData.map((b: any) => ({
        platform: b.platform,
        username: b.username,
        avatar: b.avatar || undefined,
        url: b.profileUrl,
        bookmarkedAt: Number(b.timestamp) * 1000
      }));
    } catch (error) {
      console.error('Error loading bookmarks for address:', error);
      throw error;
    }
  }

  /**
   * Get current connected address
   */
  getCurrentAddress(): string | null {
    return this.currentAddress;
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return !!this.walletClient && !!this.currentAddress;
  }
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: Record<string, unknown>;
  }
}

