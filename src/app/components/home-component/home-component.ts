import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { SearchBarComponent } from '../search-bar-component/search-bar-component';
import { IdentityService } from '../../services/identity-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';
import { appKit } from '../../config/wallet.config';
import { WalletConnect } from "../wallet-connect/wallet-connect";
import { AlertComponent, AlertType } from '../alert-component/alert-component';

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBarComponent, RouterLink, WalletConnect, AlertComponent],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
  address: string | null = null;
  currentSearchQuery: string = '';
  private destroy$ = new Subject<void>();
  
  // Track pending transactions for UI feedback
  pendingBookmarks = new Set<string>();
  
  // Alert state
  alertShow: boolean = false;
  alertType: AlertType = 'info';
  alertTitle: string = '';
  alertMessage: string = '';
  alertTxHash: string = '';

  constructor(
    public identityService: IdentityService,
    private router: Router,
    public bookmarkService: Web3BookmarkService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to bookmarks
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookmarks) => {
        console.log('Current bookmarks:', bookmarks);
        // Clear pending state when bookmarks update
        this.pendingBookmarks.clear();
        this.cdr.detectChanges();
      });

    // ✅ Get current session when app starts
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      this.zone.run(() => {
        this.address = currentAccount.address as string;
        this.cdr.detectChanges();
        console.log('Restored session with address:', this.address);
      });

      // Initialize Web3BookmarkService with wallet address
      try {
        await this.bookmarkService.initializeWithWallet(currentAccount.address as string);
        console.log('✅ Web3BookmarkService initialized');
      } catch (error) {
        console.error('❌ Error initializing Web3BookmarkService:', error);
      }
    }

    // ✅ Listen to account changes
    appKit.subscribeAccount(async (account: any) => {
      console.log('Account subscription fired:', account);
      
      setTimeout(async () => {
        this.zone.run(() => {
          this.address = account?.address ? (account.address as string) : null;
          this.cdr.detectChanges();
          console.log('Account changed:', this.address);
        });

        // Initialize or cleanup bookmark service based on wallet connection
        if (this.address) {
          try {
            await this.bookmarkService.initializeWithWallet(this.address);
            console.log('✅ Web3BookmarkService re-initialized');
          } catch (error) {
            console.error('❌ Error initializing Web3BookmarkService:', error);
          }
        } else {
          this.bookmarkService.cleanup();
          console.log('🧹 Web3BookmarkService cleaned up');
        }
      }, 100);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openConnectModal() {
    appKit.open();
  }

  get shortAddress() {
    if (!this.address) return '';
    return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
  }

  handleClear(): void {
    // Clear the search input and results
    console.log('Clearing search');
    this.currentSearchQuery = '';
    this.identityService.clearIdentity();
  }

  handleSearch(query: string): void {
    // Clear any previous search results
    this.identityService.clearIdentity();

    // Perform the search across all platforms
    this.identityService.searchIdentity(query);
  }

  /**
   * Show alert notification
   */
  private showAlert(type: AlertType, title: string, message: string, txHash: string = ''): void {
    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertTxHash = txHash;
    this.alertShow = true;
    this.cdr.detectChanges();
  }

  /**
   * Add bookmark for a platform with alerts
   */
  async toggleBookmark(platform: string, profile: any): Promise<void> {
    if (this.pendingBookmarks.has(platform)) {
      console.log('⏳ Transaction already pending for', platform);
      return;
    }

    const username = profile.username || profile.handle || 'Unknown';
    const avatar = profile.avatar || profile.pfp_url || '';
    const url = profile.url || profile.profileUrl || '';
    
    // Check if this specific profile is already bookmarked
    const isCurrentlyBookmarked = this.isBookmarked(platform, username);
    
    if (isCurrentlyBookmarked) {
      console.log('Already bookmarked:', username);
      this.showAlert(
        'info',
        'Already Bookmarked',
        `${username} is already in your bookmarks.`
      );
      setTimeout(() => { this.alertShow = false; }, 2000);
      return;
    }

    try {
      // Mark as pending
      this.pendingBookmarks.add(platform);
      
      // Show loading alert
      this.showAlert(
        'loading',
        'Processing Transaction',
        `Adding bookmark for ${username}...`
      );
      
      this.cdr.detectChanges();

      await this.bookmarkService.addBookmark(platform, {
        username,
        avatar,
        url
      });
      
      // Show success alert
      this.showAlert(
        'success',
        'Bookmark Added',
        `Successfully added ${username} to your bookmarks.`
      );
      
      setTimeout(() => { this.alertShow = false; }, 1500);
    } catch (error: any) {
      console.error('❌ Error adding bookmark:', error);
      
      // Show error alert
      if (error.message.includes('rejected') || error.message.includes('denied')) {
        this.showAlert(
          'warning',
          'Transaction Cancelled',
          'You cancelled the transaction.'
        );
      } else if (error.message.includes('Wallet not connected')) {
        this.showAlert(
          'error',
          'Wallet Not Connected',
          'Please connect your wallet first to bookmark profiles.'
        );
      } else {
        this.showAlert(
          'error',
          'Transaction Failed',
          error.message || 'Failed to add bookmark. Please try again.'
        );
      }
      
      setTimeout(() => { this.alertShow = false; }, 5000);
    } finally {
      this.pendingBookmarks.delete(platform);
      this.cdr.detectChanges();
    }
  }

  /**
   * Check if a platform and username is bookmarked (synchronous from cache)
   */
  isBookmarked(platform: string, username?: string): boolean {
    const bookmarks = this.bookmarkService.getAllBookmarks();
    
    if (!username) {
      // If no username provided, just check by platform
      return bookmarks.some(b => b.platform.toLowerCase() === platform.toLowerCase());
    }
    
    // Check by both platform and username
    return bookmarks.some(
      b => b.platform.toLowerCase() === platform.toLowerCase() && 
           b.username.toLowerCase() === username.toLowerCase()
    );
  }

  /**
   * Check if bookmark transaction is pending
   */
  isBookmarkPending(platform: string): boolean {
    return this.pendingBookmarks.has(platform);
  }

  /**
   * Get all bookmarks (useful for displaying a bookmarks list)
   */
  viewAllBookmarks(): void {
    const bookmarks = this.bookmarkService.getAllBookmarks();
    console.log('All bookmarks:', bookmarks);
    // Navigate to bookmarks page
    this.router.navigate(['/bookmarks']);
  }

  /**
   * Refresh bookmarks from blockchain
   */
  async refreshBookmarks(): Promise<void> {
    try {
      await this.bookmarkService.refreshBookmarks();
      console.log('✅ Bookmarks refreshed from blockchain');
    } catch (error) {
      console.error('❌ Error refreshing bookmarks:', error);
    }
  }

  /**
   * Get bookmarks count
   */
  getBookmarksCount(): number {
    return this.bookmarkService.getBookmarksCount();
  }
}
