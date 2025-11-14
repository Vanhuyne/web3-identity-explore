import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { appKit } from '../../config/wallet.config';
import { CommonModule } from '@angular/common';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';
import { Subscription } from 'rxjs';

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
  
  // ✅ Thêm subscription để quản lý
  private bookmarkSubscription?: Subscription;

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private bookmarkService: Web3BookmarkService 
  ) {}

  ngOnInit(): void {
    // ✅ Subscribe để log bookmarks mỗi khi có thay đổi
    this.subscribeToBookmarks();

    // Get current session when component initializes
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      this.zone.run(() => {
        this.address = currentAccount.address as string;
        this.isConnected = true;
        this.cdr.detectChanges();
        console.log('Wallet already connected:', this.address);

        // Initialize bookmarks when wallet is connected
        this.initializeBookmarkService(this.address);
      });
    }

    // Listen to account changes
    appKit.subscribeAccount((account: any) => {
      console.log('Wallet account subscription fired:', account);
      setTimeout(() => {
        this.zone.run(() => {
          this.address = account?.address ? (account.address as string) : null;
          this.isConnected = !!account?.address;
          this.cdr.detectChanges();
          console.log('Wallet state updated - Connected:', this.isConnected, 'Address:', this.address);
          
          // Handle connection/disconnection
          if (this.address) {
            this.initializeBookmarkService(this.address);
            console.log('Bookmark service initialized for address:', this.address);
          } else {
            this.bookmarkService.cleanup();
          }
        });
      }, 100);
    });
  }

  ngOnDestroy(): void {
    // ✅ Cleanup subscriptions
    if (this.bookmarkSubscription) {
      this.bookmarkSubscription.unsubscribe();
    }
    this.bookmarkService.cleanup();
  }

  /**
   * ✅ Subscribe to bookmarks observable to log changes
   */
  private subscribeToBookmarks(): void {
    this.bookmarkSubscription = this.bookmarkService.bookmarks$.subscribe({
      next: (bookmarks) => {
        console.log('📚 Bookmarks Updated:', bookmarks);
        console.log('📊 Total Bookmarks:', bookmarks.length);
        
        // Log chi tiết từng bookmark
        if (bookmarks.length > 0) {
          console.table(bookmarks.map(b => ({
            Platform: b.platform,
            Username: b.username,
            URL: b.url,
            BookmarkedAt: new Date(b.bookmarkedAt).toLocaleString()
          })));
        } else {
          console.log('ℹ️ No bookmarks found for this address');
        }
      },
      error: (error) => {
        console.error('❌ Error loading bookmarks:', error);
      }
    });

    // ✅ Subscribe to loading state
    this.bookmarkService.loading$.subscribe(isLoading => {
      console.log('⏳ Bookmarks Loading:', isLoading);
    });

    // ✅ Subscribe to errors
    this.bookmarkService.error$.subscribe(error => {
      if (error) {
        console.error('⚠️ Bookmark Error:', error);
      }
    });
  }

  /**
   * Open the wallet connection modal
   */
  openConnectModal(): void {
    appKit.open();
  }

  /**
   * Initialize bookmark service
   */
  private async initializeBookmarkService(address: string): Promise<void> {
    try {
      console.log('🚀 Initializing bookmark service for:', address);
      await this.bookmarkService.initializeWithWallet(address);
      console.log('✅ Bookmark service initialized successfully');
      
      // ✅ Log thêm thông tin chi tiết
      const count = this.bookmarkService.getBookmarksCount();
      console.log(`📊 Found ${count} bookmarks for this address`);
      
    } catch (error) {
      console.error('❌ Failed to initialize bookmark service:', error);
    }
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
        this.cdr.detectChanges();
        console.log('👋 Wallet disconnected');

        // Cleanup on disconnect
        this.bookmarkService.cleanup();
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
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
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }

  // ✅ Thêm method để refresh và log bookmarks bất cứ lúc nào
  async refreshAndLogBookmarks(): Promise<void> {
    console.log('🔄 Manually refreshing bookmarks...');
    await this.bookmarkService.refreshBookmarks();
  }
}