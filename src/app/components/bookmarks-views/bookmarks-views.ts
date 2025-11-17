import { ChangeDetectorRef, Component } from '@angular/core';
import { BookmarkedProfile } from '../../services/bookmark-service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bookmarks-views',
  imports: [CommonModule, RouterModule, FormsModule],
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

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly bookmarkService: Web3BookmarkService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscribeToBookmarks();
    this.subscribeToLoadingState();
    this.subscribeToErrors();
    this.subscribeToAddress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
   * Subscribe to loading state
   */
  private subscribeToLoadingState(): void {
    this.bookmarkService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isLoading) => {
        this.isLoading = isLoading;
      });
  }

  /**
   * Subscribe to error state
   */
  private subscribeToErrors(): void {
    this.bookmarkService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.error = error;
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
        this.showWalletWarning = !address && this.bookmarks.length === 0;
      });
  }

  /**
   * Remove a bookmark by platform with optimistic updates
   */
  async removeBookmark(platform: string): Promise<void> {
    // Prevent duplicate removal requests
    if (this.pendingRemovals.has(platform)) {
      console.log('⏳ Removal already in progress for', platform);
      return;
    }

    // Confirm deletion
    const bookmark = this.bookmarks.find(b => b.platform === platform);
    const confirmMessage = bookmark 
      ? `Are you sure you want to remove ${bookmark.username} from your bookmarks?`
      : 'Are you sure you want to remove this bookmark?';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Mark as pending
      this.pendingRemovals.add(platform);
      this.error = null;
      this.cdr.detectChanges();

      console.log('🔄 Removing bookmark:', platform);
      
      // Remove from blockchain
      await this.bookmarkService.removeBookmark(platform);
      
      console.log('✅ Bookmark removed:', platform);
    } catch (error: any) {
      console.error('❌ Error removing bookmark:', error);
      
      // Show user-friendly error message
      if (error.message.includes('rejected') || error.message.includes('denied')) {
        this.error = 'Transaction was cancelled.';
      } else if (error.message.includes('Wallet not connected')) {
        this.error = 'Please connect your wallet to remove bookmarks.';
        this.showWalletWarning = true;
      } else {
        this.error = error.message || 'Failed to remove bookmark. Please try again.';
      }
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
   * Refresh bookmarks from blockchain
   */
  async refreshBookmarks(): Promise<void> {
    try {
      this.error = null;
      await this.bookmarkService.refreshBookmarks();
      console.log('✅ Bookmarks refreshed from blockchain');
    } catch (error) {
      console.error('❌ Error refreshing bookmarks:', error);
      this.error = 'Failed to refresh bookmarks from blockchain.';
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.error = null;
  }
}
