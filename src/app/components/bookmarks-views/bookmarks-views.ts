import { ChangeDetectorRef, Component } from '@angular/core';
import { BookmarkedProfile } from '../../services/bookmark-service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';
import { FormsModule } from '@angular/forms';
import { AlertComponent, AlertType } from '../alert-component/alert-component';
import { appKit } from '../../config/wallet.config';

@Component({
  selector: 'app-bookmarks-views',
  imports: [CommonModule, RouterModule, FormsModule, AlertComponent],
  standalone: true,
  templateUrl: './bookmarks-views.html',
  styleUrl: './bookmarks-views.css',
})
export class BookmarksViews {
  bookmarks: BookmarkedProfile[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  connectedAddress: string | null = null;
  showWalletWarning: boolean = false;
  
  // Track pending remove operations
  pendingRemovals = new Set<string>();
  
  // Alert state
  alertShow: boolean = false;
  alertType: AlertType = 'info';
  alertTitle: string = '';
  alertMessage: string = '';
  alertTxHash: string = '';
  
  // Prevent alert duplication
  private alertTimeout: any = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly bookmarkService: Web3BookmarkService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Check if wallet is connected on page load
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      console.log('✅ Wallet connected on page load:', currentAccount.address);
      this.connectedAddress = currentAccount.address as string;
      this.showWalletWarning = false;
      
      try {
        // Initialize Web3BookmarkService with wallet
        await this.bookmarkService.initializeWithWallet(currentAccount.address as string);
        console.log('✅ Web3BookmarkService initialized in bookmarks view');
      } catch (error) {
        console.error('❌ Error initializing Web3BookmarkService:', error);
        this.showAlert(
          'error',
          'Initialization Failed',
          'Failed to connect to wallet. Please refresh the page.'
        );
        this.hideAlert(5000);
      }
    } else {
      console.log('⚠️ No wallet connected on page load');
      // Don't show warning immediately - wait to see if we have cached bookmarks
      this.showWalletWarning = false;
    }

    // Subscribe to account changes
    appKit.subscribeAccount(async (account: any) => {
      console.log('Account changed in bookmarks view:', account);
      
      if (account?.address) {
        this.connectedAddress = account.address as string;
        this.showWalletWarning = false;
        
        try {
          await this.bookmarkService.initializeWithWallet(account.address as string);
          console.log('✅ Web3BookmarkService re-initialized after account change');
        } catch (error) {
          console.error('❌ Error re-initializing Web3BookmarkService:', error);
        }
      } else {
        this.connectedAddress = null;
        // Only show warning if user tries to interact without wallet
        this.showWalletWarning = false;
      }
      
      this.cdr.detectChanges();
    });

    this.subscribeToBookmarks();
    this.subscribeToAddress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
  }

  /**
   * Subscribe to bookmarks data
   */
  private subscribeToBookmarks(): void {
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookmarks) => {
          this.bookmarks = bookmarks;
          console.log('📚 Loaded bookmarks:', bookmarks.length);
          
          // Only show wallet warning if no bookmarks and no wallet connected
          if (bookmarks.length === 0 && !this.connectedAddress) {
            this.showWalletWarning = true;
          } else {
            this.showWalletWarning = false;
          }
          
          // Clear pending removals when bookmarks update
          this.pendingRemovals.clear();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error loading bookmarks:', error);
          this.error = 'Failed to load bookmarks';
        }
      });
  }

  /**
   * Subscribe to connected address
   */
  private subscribeToAddress(): void {
    this.bookmarkService.address$
      .pipe(takeUntil(this.destroy$))
      .subscribe((address) => {
        this.connectedAddress = address;
        
        // Update wallet warning based on both address and bookmarks
        if (!address && this.bookmarks.length === 0) {
          this.showWalletWarning = true;
        } else {
          this.showWalletWarning = false;
        }
      });
  }

  /**
   * Show alert notification (clears previous alerts)
   */
  private showAlert(type: AlertType, title: string, message: string, txHash: string = ''): void {
    // Clear any existing timeout
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;
    this.alertTxHash = txHash;
    this.alertShow = true;
    this.cdr.detectChanges();
  }

  /**
   * Hide alert
   */
  private hideAlert(delay: number = 0): void {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }
    
    if (delay > 0) {
      this.alertTimeout = setTimeout(() => {
        this.alertShow = false;
        this.alertTimeout = null;
        this.cdr.detectChanges();
      }, delay);
    } else {
      this.alertShow = false;
      this.alertTimeout = null;
      this.cdr.detectChanges();
    }
  }

  /**
   * Remove a bookmark by platform with alerts
   */
  async removeBookmark(platform: string): Promise<void> {
    // Check if wallet is connected
    if (!this.connectedAddress) {
      this.showAlert(
        'error',
        'Wallet Not Connected',
        'Please connect your wallet to remove bookmarks.'
      );
      this.hideAlert(5000);
      return;
    }

    // Prevent duplicate removal requests
    if (this.pendingRemovals.has(platform)) {
      console.log('⏳ Removal already in progress for', platform);
      return;
    }

    // Get bookmark details
    const bookmark = this.bookmarks.find(b => b.platform === platform);
    const username = bookmark?.username || platform;
    
    // Confirm deletion
    const confirmMessage = bookmark 
      ? `Are you sure you want to remove ${username} from your bookmarks?`
      : 'Are you sure you want to remove this bookmark?';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Mark as pending
      this.pendingRemovals.add(platform);
      this.error = null;
      
      // Show loading alert
      this.showAlert(
        'loading',
        'Removing Bookmark',
        `Removing ${username} from your bookmarks...`
      );

      console.log('🔄 Removing bookmark:', platform);
      
      // Remove from blockchain
      await this.bookmarkService.removeBookmark(platform);
      
      console.log('✅ Bookmark removed:', platform);
      
      // Show success alert - AlertComponent will auto-dismiss
      this.showAlert(
        'success',
        'Bookmark Removed',
        `Successfully removed ${username} from your bookmarks.`
      );
      
    } catch (error: any) {
      console.error('❌ Error removing bookmark:', error);
      
      // Show error alert
      if (error.message.includes('rejected') || error.message.includes('denied')) {
        this.showAlert(
          'warning',
          'Transaction Cancelled',
          'You cancelled the bookmark removal.'
        );
      } else if (error.message.includes('Wallet not connected')) {
        this.showAlert(
          'error',
          'Wallet Not Connected',
          'Please connect your wallet to remove bookmarks.'
        );
      } else {
        this.showAlert(
          'error',
          'Removal Failed',
          error.message || 'Failed to remove bookmark. Please try again.'
        );
      }
      
      this.hideAlert(5000);
      
    } finally {
      // Remove pending state
      this.pendingRemovals.delete(platform);
      this.cdr.detectChanges();
    }
  }

  /**
   * Check if a bookmark removal is pending
   */
  isRemovalPending(platform: string): boolean {
    return this.pendingRemovals.has(platform);
  }

  /**
   * Navigate to connect wallet
   */
  connectWallet(): void {
    this.router.navigate(['/']);
  }

  /**
   * Open wallet connect modal
   */
  openConnectModal(): void {
    appKit.open();
  }

  /**
   * Refresh bookmarks from blockchain
   */
  async refreshBookmarks(): Promise<void> {
    if (!this.connectedAddress) {
      this.showAlert(
        'error',
        'Wallet Not Connected',
        'Please connect your wallet to refresh bookmarks.'
      );
      this.hideAlert(5000);
      return;
    }

    try {
      this.error = null;
      
      // Show loading alert
      this.showAlert(
        'loading',
        'Refreshing Bookmarks',
        'Loading bookmarks from blockchain...'
      );
      
      await this.bookmarkService.refreshBookmarks();
      
      console.log('✅ Bookmarks refreshed from blockchain');
      
      // Show success alert - AlertComponent will auto-dismiss
      this.showAlert(
        'success',
        'Bookmarks Refreshed',
        'Successfully loaded bookmarks from blockchain.'
      );
      
    } catch (error) {
      console.error('❌ Error refreshing bookmarks:', error);
      
      // Show error alert
      this.showAlert(
        'error',
        'Refresh Failed',
        'Failed to refresh bookmarks from blockchain.'
      );
      
      this.hideAlert(5000);
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.error = null;
  }
}
