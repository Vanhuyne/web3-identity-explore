import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { createPublicClient, createWalletClient, custom, http, fallback } from 'viem';
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
  private readonly CONTRACT_ADDRESS = '0x7CC4d42892A048DcCD337fd73D8f4849C52CDBf6';
  
  // ✅ FIX 1: Sử dụng nhiều RPC endpoints với fallback
  private readonly RPC_ENDPOINTS = [
    'https://alfajores-forno.celo-testnet.org',
    'https://forno.celo-sepolia.celo-testnet.org', // URL cũ của bạn
    'https://celo-alfajores.infura.io/v3/YOUR_INFURA_KEY', // Thay YOUR_INFURA_KEY nếu có
  ];

  // ✅ FIX 2: Timeout và retry configuration
  private readonly REQUEST_TIMEOUT = 30000; // 30 giây
  private readonly MAX_RETRIES = 3;

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
   * ✅ FIX 3: Initialize với fallback transport và timeout
   */
  private initializePublicClient(): void {
    try {
      // Tạo nhiều transport với timeout
      const transports = this.RPC_ENDPOINTS.map(url => 
        http(url, {
          timeout: this.REQUEST_TIMEOUT,
          retryCount: this.MAX_RETRIES,
          retryDelay: 1000, // 1 giây giữa các retry
        })
      );

      this.publicClient = createPublicClient({
        chain: celoAlfajores,
        transport: fallback(transports, {
          rank: false, // Thử theo thứ tự
        }),
        batch: {
          multicall: true, // Bật batch requests
        },
      });

      console.log('✅ Public client initialized with fallback RPC endpoints');
    } catch (error) {
      console.error('❌ Error initializing public client:', error);
    }
  }

  /**
   * Initialize with connected wallet
   */
  async initializeWithWallet(address: string): Promise<void> {
    if (!address) {
      console.error('❌ No address provided');
      return;
    }

    try {
      this.loadingSubject.next(true);
      this.currentAddress = address as `0x${string}`;

      // Check if ethereum provider exists
      if (typeof window.ethereum === 'undefined') {
        throw new Error('Ethereum provider not found');
      }

      // ✅ FIX 4: Initialize wallet client (custom transport không có timeout option)
      this.walletClient = createWalletClient({
        chain: celoAlfajores,
        transport: custom(window.ethereum as any)
      });

      // Load user's bookmarks với retry
      await this.loadBookmarksFromContract(this.currentAddress);

      console.log('✅ Web3 initialized successfully for address:', address);
    } catch (error: any) {
      console.error('❌ Error initializing Web3:', error);
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
   * ✅ FIX 5: Load bookmarks với retry logic và error handling tốt hơn
   */
  private async loadBookmarksFromContract(
    address: `0x${string}`, 
    retryCount = 0
  ): Promise<void> {
    try {
      this.loadingSubject.next(true);

      if (!this.publicClient) {
        throw new Error('Public client not initialized');
      }

      console.log(`🔄 Loading bookmarks (attempt ${retryCount + 1}/${this.MAX_RETRIES + 1})...`);

      const bookmarksData = await this.publicClient.readContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'getAllBookmarks',
        args: [address]
      }) as any[];

      const bookmarks: BookmarkedProfile[] = bookmarksData
        .filter((b: any) => b.exists) // Chỉ lấy bookmarks còn tồn tại
        .map((b: any) => ({
          platform: b.platform,
          username: b.username,
          avatar: b.avatar || undefined,
          url: b.profileUrl,
          bookmarkedAt: Number(b.timestamp) * 1000
        }));

      this.bookmarksSubject.next(bookmarks);
      this.errorSubject.next(null);

      console.log('✅ Loaded bookmarks for address', address, bookmarks);
    } catch (error: any) {
      console.error(`❌ Error loading bookmarks (attempt ${retryCount + 1}):`, error);

      // ✅ FIX 6: Retry logic
      if (retryCount < this.MAX_RETRIES) {
        console.log(`⏳ Retrying in ${(retryCount + 1) * 2} seconds...`);
        await this.delay((retryCount + 1) * 2000); // Exponential backoff
        return this.loadBookmarksFromContract(address, retryCount + 1);
      }

      // Nếu hết retry, set empty array thay vì throw
      this.bookmarksSubject.next([]);
      
      const errorMessage = this.getReadableError(error);
      this.errorSubject.next(errorMessage);
      console.error('❌ Final error:', errorMessage);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * ✅ FIX 7: Helper để delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ✅ FIX 8: Convert error thành message dễ hiểu
   */
  private getReadableError(error: any): string {
    if (error.message?.includes('timeout') || error.message?.includes('took too long')) {
      return 'Network timeout. Please check your connection and try again.';
    }
    if (error.message?.includes('fetch failed')) {
      return 'Network error. Unable to connect to blockchain.';
    }
    if (error.message?.includes('contract')) {
      return 'Smart contract error. Please verify the contract address.';
    }
    return error.shortMessage || error.message || 'Unknown error occurred';
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

      console.log('📤 Transaction sent:', hash);

      // Wait for confirmation
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ 
          hash,
          timeout: this.REQUEST_TIMEOUT 
        });
        console.log('✅ Transaction confirmed:', receipt.transactionHash);
      }

      // Reload bookmarks
      await this.loadBookmarksFromContract(this.currentAddress);

    } catch (error: any) {
      console.error('❌ Error adding bookmark:', error);
      const errorMessage = this.getReadableError(error);
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

      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'removeBookmark',
        args: [platform],
        account: this.currentAddress,
        chain: celoAlfajores
      });

      console.log('📤 Transaction sent:', hash);

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ 
          hash,
          timeout: this.REQUEST_TIMEOUT 
        });
        console.log('✅ Transaction confirmed:', receipt.transactionHash);
      }

      await this.loadBookmarksFromContract(this.currentAddress);

    } catch (error: any) {
      console.error('❌ Error removing bookmark:', error);
      const errorMessage = this.getReadableError(error);
      this.errorSubject.next(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Toggle bookmark
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
      console.error('❌ Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Check if a platform is bookmarked (synchronous)
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

      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'clearAllBookmarks',
        account: this.currentAddress,
        chain: celoAlfajores
      });

      console.log('📤 Transaction sent:', hash);

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({ 
          hash,
          timeout: this.REQUEST_TIMEOUT 
        });
        console.log('✅ Transaction confirmed:', receipt.transactionHash);
      }

      this.bookmarksSubject.next([]);

    } catch (error: any) {
      console.error('❌ Error clearing bookmarks:', error);
      const errorMessage = this.getReadableError(error);
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

      return bookmarksData
        .filter((b: any) => b.exists)
        .map((b: any) => ({
          platform: b.platform,
          username: b.username,
          avatar: b.avatar || undefined,
          url: b.profileUrl,
          bookmarkedAt: Number(b.timestamp) * 1000
        }));
    } catch (error) {
      console.error('❌ Error loading bookmarks for address:', error);
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

// No need to extend Window interface - already declared in appkit.d.ts
// Just use 'as any' when needed