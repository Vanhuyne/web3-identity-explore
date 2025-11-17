import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  fallback,
} from 'viem';
import { baseSepolia } from 'viem/chains';

export interface BookmarkedProfile {
  platform: string;
  username: string;
  avatar?: string;
  url: string;
  bookmarkedAt: number;
}

interface ContractBookmark {
  platform: string;
  username: string;
  avatar: string;
  profileUrl: string;
  timestamp: bigint;
  exists: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Web3BookmarkService implements OnDestroy {
  // Contract Configuration
  private readonly CONTRACT_ADDRESS =
    '0x56556fE7F6274b0d6748b759cEcA3E113218068C' as const;

  private readonly RPC_ENDPOINTS = [
    'https://base-sepolia.drpc.org',
    'https://base-sepolia-rpc.publicnode.com',
  ] as const;

  private readonly REQUEST_TIMEOUT = 30000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 2000;
  private readonly POST_TX_DELAY = 1000;
  
  // LocalStorage key for caching bookmarks
  private readonly STORAGE_KEY = 'web3_bookmarks_cache';

  // Contract ABI (typed for better type safety)
  private readonly CONTRACT_ABI = [
    {
      name: 'addBookmark',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: '_platform', type: 'string' },
        { name: '_username', type: 'string' },
        { name: '_avatar', type: 'string' },
        { name: '_profileUrl', type: 'string' },
      ],
      outputs: [],
    },
    {
      name: 'removeBookmark',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: '_platform', type: 'string' }],
      outputs: [],
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
            { name: 'exists', type: 'bool' },
          ],
        },
      ],
    },
    {
      name: 'isBookmarked',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: '_user', type: 'address' },
        { name: '_platform', type: 'string' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    },
    {
      name: 'clearAllBookmarks',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [],
      outputs: [],
    },
  ] as const;

  // State management with proper typing
  private readonly bookmarksSubject = new BehaviorSubject<BookmarkedProfile[]>(
    []
  );
  public readonly bookmarks$: Observable<BookmarkedProfile[]> =
    this.bookmarksSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  public readonly loading$: Observable<boolean> =
    this.loadingSubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  public readonly error$: Observable<string | null> =
    this.errorSubject.asObservable();

  private readonly addressSubject = new BehaviorSubject<`0x${string}` | null>(
    null
  );
  public readonly address$: Observable<`0x${string}` | null> =
    this.addressSubject.asObservable();

  // Cleanup subject for subscriptions
  private readonly destroy$ = new Subject<void>();

  // Viem clients with proper typing
  private publicClient: any = null;
  private walletClient: any = null;
  private currentAddress: `0x${string}` | null = null;

  // Prevent duplicate initialization
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializePublicClient();
    // Load bookmarks from cache on initialization
    this.loadBookmarksFromCache();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  /**
   * Load bookmarks from localStorage cache
   */
  private loadBookmarksFromCache(): void {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const bookmarks = JSON.parse(cached) as BookmarkedProfile[];
        this.bookmarksSubject.next(bookmarks);
        console.log('📚 Loaded bookmarks from cache:', bookmarks.length);
      }
    } catch (error) {
      console.error('❌ Error loading bookmarks from cache:', error);
    }
  }

  /**
   * Save bookmarks to localStorage cache
   */
  private saveBookmarksToCache(bookmarks: BookmarkedProfile[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
      console.log('💾 Saved bookmarks to cache:', bookmarks.length);
    } catch (error) {
      console.error('❌ Error saving bookmarks to cache:', error);
    }
  }

  /**
   * Initialize public client with optimized settings
   */
  private initializePublicClient(): void {
    try {
      const transports = this.RPC_ENDPOINTS.map((url) =>
        http(url, {
          timeout: this.REQUEST_TIMEOUT,
          retryCount: this.MAX_RETRIES,
          retryDelay: 1000,
        })
      );

      this.publicClient = createPublicClient({
        chain: baseSepolia,
        transport: fallback(transports, { rank: false }),
        batch: { multicall: true },
        cacheTime: 60000,
      });

      console.log('✅ Public client (Base Sepolia) initialized');
    } catch (error) {
      console.error('❌ Error initializing public client:', error);
      this.errorSubject.next('Failed to initialize blockchain connection');
    }
  }

  /**
   * Initialize with connected wallet (prevents duplicate calls)
   */
  async initializeWithWallet(address: string): Promise<void> {
    // Prevent duplicate initialization
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Check if already initialized with same address
    if (this.currentAddress === address && this.walletClient) {
      console.log('⚠️ Already initialized with address:', address);
      return;
    }

    this.initializationPromise = this._initializeWithWallet(address);

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async _initializeWithWallet(address: string): Promise<void> {
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      this.currentAddress = address as `0x${string}`;
      this.addressSubject.next(this.currentAddress);

      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Ethereum provider not found');
      }

      this.walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom(window.ethereum as any),
      });

      // Load bookmarks from blockchain
      await this.loadBookmarksFromContract(this.currentAddress);

      console.log('✅ Web3 initialized for:', address);
    } catch (error: any) {
      console.error('❌ Error initializing Web3:', error);
      const errorMessage = this.getReadableError(error);
      this.errorSubject.next(errorMessage);
      throw new Error(errorMessage);
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
    // Don't clear bookmarks - keep cache
    this.errorSubject.next(null);
    this.addressSubject.next(null);
    this.initializationPromise = null;

    console.log('🧹 Service cleaned up (cache retained)');
  }

  /**
   * Load bookmarks from contract with retry logic
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

      console.log(
        `🔄 Loading bookmarks from blockchain (attempt ${retryCount + 1}/${
          this.MAX_RETRIES + 1
        })...`
      );

      const bookmarksData = (await this.publicClient.readContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'getAllBookmarks',
        args: [address],
        blockTag: 'latest',
      })) as ContractBookmark[];

      const bookmarks: BookmarkedProfile[] = bookmarksData
        .filter((b) => b.exists)
        .map((b) => ({
          platform: b.platform,
          username: b.username,
          avatar: b.avatar || undefined,
          url: b.profileUrl,
          bookmarkedAt: Number(b.timestamp) * 1000,
        }));

      this.bookmarksSubject.next(bookmarks);
      this.saveBookmarksToCache(bookmarks); // Save to cache
      this.errorSubject.next(null);

      console.log(`✅ Loaded ${bookmarks.length} bookmarks from blockchain`);
    } catch (error: any) {
      console.error(
        `❌ Error loading bookmarks (attempt ${retryCount + 1}):`,
        error
      );

      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_BASE * (retryCount + 1);
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await this.delay(delay);
        return this.loadBookmarksFromContract(address, retryCount + 1);
      }

      // Don't clear bookmarks on error - keep cache
      const errorMessage = this.getReadableError(error);
      this.errorSubject.next(errorMessage);
      console.warn('⚠️ Using cached bookmarks due to network error');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Refresh bookmarks from blockchain
   */
  async refreshBookmarks(): Promise<void> {
    if (!this.currentAddress) {
      console.warn('⚠️ No address to refresh bookmarks for');
      return;
    }

    await this.loadBookmarksFromContract(this.currentAddress);
  }

  /**
   * Add a bookmark to the blockchain
   */
  async addBookmark(platform: string, profile: any): Promise<void> {
    if (!this.walletClient || !this.currentAddress) {
      throw new Error(
        'Wallet not connected. Please connect your wallet first.'
      );
    }

    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      const username = profile.username || profile.handle || 'Unknown';
      const avatar = profile.avatar || '';
      const url = profile.url || '';

      // Check if already bookmarked
      const isBookmarked = await this.isBookmarked(platform);
      if (isBookmarked) {
        throw new Error(`${platform} is already bookmarked`);
      }

      // Send transaction
      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'addBookmark',
        args: [platform, username, avatar, url],
        account: this.currentAddress,
        chain: baseSepolia,
      });

      console.log('📤 Transaction sent:', hash);

      // Wait for confirmation
      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          timeout: this.REQUEST_TIMEOUT,
        });
        console.log('✅ Transaction confirmed:', receipt.transactionHash);
      }

      // Wait for blockchain state to update
      await this.delay(this.POST_TX_DELAY);

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
      throw new Error(
        'Wallet not connected. Please connect your wallet first.'
      );
    }

    try {
      const current = await this.walletClient.getChainId();
      if (current !== baseSepolia.id) {
        await this.switchToBaseSepolia();
      }

      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      const hash = await this.walletClient.writeContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'removeBookmark',
        args: [platform],
        account: this.currentAddress,
        chain: baseSepolia,
      });

      console.log('📤 Transaction sent:', hash);

      if (this.publicClient) {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
          timeout: this.REQUEST_TIMEOUT,
        });
        console.log('✅ Transaction confirmed:', receipt.transactionHash);
      }

      await this.delay(this.POST_TX_DELAY);
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
        args: [this.currentAddress, platform],
        blockTag: 'latest',
      });

      return result as boolean;
    } catch (error) {
      console.error('❌ Error checking bookmark status:', error);
      return false;
    }
  }

  /**
   * Check if a platform is bookmarked (synchronous from cache)
   */
  isBookmarkedSync(platform: string): boolean {
    return this.bookmarksSubject.value.some((b) => b.platform === platform);
  }

  /**
   * Get all bookmarks (synchronous)
   */
  getAllBookmarks(): BookmarkedProfile[] {
    return [...this.bookmarksSubject.value];
  }

  /**
   * Get bookmark by platform
   */
  getBookmark(platform: string): BookmarkedProfile | undefined {
    return this.bookmarksSubject.value.find((b) => b.platform === platform);
  }

  /**
   * Get bookmarks count
   */
  getBookmarksCount(): number {
    return this.bookmarksSubject.value.length;
  }

  /**
   * Get bookmarks for any address
   */
  async getBookmarksForAddress(address: string): Promise<BookmarkedProfile[]> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const bookmarksData = (await this.publicClient.readContract({
        address: this.CONTRACT_ADDRESS,
        abi: this.CONTRACT_ABI,
        functionName: 'getAllBookmarks',
        args: [address as `0x${string}`],
        blockTag: 'latest',
      })) as ContractBookmark[];

      return bookmarksData
        .filter((b) => b.exists)
        .map((b) => ({
          platform: b.platform,
          username: b.username,
          avatar: b.avatar || undefined,
          url: b.profileUrl,
          bookmarkedAt: Number(b.timestamp) * 1000,
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

  /**
   * Check if bookmarks are available (from cache or blockchain)
   */
  hasBookmarks(): boolean {
    return this.bookmarksSubject.value.length > 0;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get readable error message
   */
  private getReadableError(error: any): string {
    const message = error.message || '';

    if (message.includes('timeout') || message.includes('took too long')) {
      return 'Network timeout. Please check your connection and try again.';
    }
    if (message.includes('fetch failed')) {
      return 'Network error. Unable to connect to blockchain.';
    }
    if (message.includes('contract')) {
      return 'Smart contract error. Please verify the contract address.';
    }
    if (message.includes('rejected') || message.includes('denied')) {
      return 'Transaction rejected by user.';
    }

    return error.shortMessage || message || 'Unknown error occurred';
  }

  async switchToBaseSepolia() {
    if (!this.walletClient) {
      throw new Error('Wallet client chưa được khởi tạo');
    }

    const chainId = baseSepolia.id;

    try {
      await this.walletClient.switchChain({ id: chainId });
      console.log('Switched to Base Sepolia:', chainId);
    } catch (err) {
      console.error('Error switching chain:', err);
      throw err;
    }
  }
}
