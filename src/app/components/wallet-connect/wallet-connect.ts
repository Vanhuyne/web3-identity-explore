import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { appKit } from '../../config/wallet.config';
import { CommonModule } from '@angular/common';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';
import { debounceTime, distinctUntilChanged, Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-wallet-connect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-connect.html',
  styleUrl: './wallet-connect.css',
})
export class WalletConnect implements OnInit, OnDestroy {
  address: string | null = null;
  isConnected: boolean = false;
  isInitializing: boolean = false;

  // Cleanup subject
  private readonly destroy$ = new Subject<void>();

  // Track last processed address to prevent duplicate processing
  private lastProcessedAddress: string | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly bookmarkService: Web3BookmarkService
  ) {}

  ngOnInit(): void {
    this.initializeWalletConnection();
    this.subscribeToBookmarkUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize wallet connection and handle account changes
   */
  private initializeWalletConnection(): void {
    // Check initial connection state
    const currentAccount = appKit.getAccount();
    
    if (currentAccount?.address) {
      this.handleAccountChange(currentAccount.address as string);
    }

    // Subscribe to account changes with debounce to prevent rapid firing
    const accountSubject = new Subject<string | null>();
    
    accountSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100), // Debounce rapid changes
        distinctUntilChanged() // Only emit when value actually changes
      )
      .subscribe((address) => {
        this.handleAccountChange(address);
      });

    // Listen to wallet account changes
    appKit.subscribeAccount((account: any) => {
      console.log('Wallet account event:', account?.address || 'disconnected');
      accountSubject.next(account?.address ? (account.address as string) : null);
    });
  }

  /**
   * Handle account changes (connection/disconnection)
   */
  private handleAccountChange(address: string | null): void {
    // Prevent processing same address multiple times
    if (address === this.lastProcessedAddress) {
      console.log('⚠️ Skipping duplicate address processing:', address);
      return;
    }

    this.lastProcessedAddress = address;

    this.zone.run(() => {
      this.address = address;
      this.isConnected = !!address;
      this.cdr.detectChanges();

      if (address) {
        this.initializeBookmarkService(address);
      } else {
        this.cleanupBookmarkService();
      }
    });
  }

  /**
   * Subscribe to bookmark updates for logging/debugging
   */
  private subscribeToBookmarkUpdates(): void {
    // Subscribe to bookmarks
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookmarks) => {
          console.log('📚 Bookmarks Updated:', bookmarks.length);
          if (bookmarks.length > 0) {
            console.table(
              bookmarks.map((b) => ({
                Platform: b.platform,
                Username: b.username,
                URL: b.url,
                BookmarkedAt: new Date(b.bookmarkedAt).toLocaleString(),
              }))
            );
          }
        },
        error: (error) => {
          console.error('❌ Bookmark subscription error:', error);
        },
      });

    // Subscribe to loading state
    this.bookmarkService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.isInitializing = isLoading;
        this.cdr.detectChanges();
      });

    // Subscribe to errors
    this.bookmarkService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        if (error) {
          console.error('⚠️ Bookmark Error:', error);
        }
      });
  }

  /**
   * Initialize bookmark service for connected wallet
   */
  private async initializeBookmarkService(address: string): Promise<void> {
    try {
      console.log('🚀 Initializing bookmark service for:', address);
      await this.bookmarkService.initializeWithWallet(address);
      
      const count = this.bookmarkService.getBookmarksCount();
      console.log(`✅ Bookmark service initialized with ${count} bookmarks`);
    } catch (error) {
      console.error('❌ Failed to initialize bookmark service:', error);
    }
  }

  /**
   * Cleanup bookmark service on disconnect
   */
  private cleanupBookmarkService(): void {
    console.log('🧹 Cleaning up bookmark service');
    this.bookmarkService.cleanup();
  }

  /**
   * Open the wallet connection modal
   */
  openConnectModal(): void {
    appKit.open();
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      await appKit.disconnect();
      
      this.zone.run(() => {
        this.address = null;
        this.isConnected = false;
        this.lastProcessedAddress = null;
        this.cdr.detectChanges();
        console.log('👋 Wallet disconnected');
      });

      this.cleanupBookmarkService();
    } catch (error) {
      console.error('❌ Error disconnecting wallet:', error);
    }
  }

  /**
   * Get shortened address format (0x1234...5678)
   */
  get shortAddress(): string {
    if (!this.address) return '';
    return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
  }

  /**
   * Copy address to clipboard
   */
  async copyAddress(): Promise<void> {
    if (!this.address) return;

    try {
      await navigator.clipboard.writeText(this.address);
      console.log('📋 Address copied to clipboard');
      // You could add a toast notification here
    } catch (error) {
      console.error('❌ Failed to copy address:', error);
    }
  }

  /**
   * Manually refresh bookmarks
   */
  async refreshBookmarks(): Promise<void> {
    console.log('🔄 Manually refreshing bookmarks...');
    try {
      await this.bookmarkService.refreshBookmarks();
      console.log('✅ Bookmarks refreshed');
    } catch (error) {
      console.error('❌ Error refreshing bookmarks:', error);
    }
  }

  /**
   * Get current bookmark count
   */
  get bookmarkCount(): number {
    return this.bookmarkService.getBookmarksCount();
  }

  /**
   * Check if service is initialized
   */
  get isServiceInitialized(): boolean {
    return this.bookmarkService.isInitialized();
  }
}