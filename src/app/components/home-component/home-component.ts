import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { SearchBarComponent } from '../search-bar-component/search-bar-component';
import { IdentityService } from '../../services/identity-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { appKit } from '../../config/wallet.config';
import { WalletConnect } from "../wallet-connect/wallet-connect";
import { BookmarkService } from '../../services/bookmark-service';
import { SearchResults } from '../search-results/search-results';

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBarComponent, RouterLink, WalletConnect, SearchResults],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
  address: string | null = null;
  currentSearchQuery: string = '';
  private destroy$ = new Subject<void>();
  
  // Track pending transactions for UI feedback
  pendingBookmarks = new Set<string>();

  constructor(
    public identityService: IdentityService,
    private router: Router,
    public bookmarkService: BookmarkService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Subscribe to bookmarks
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookmarks) => {
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
      });

      // Initialize Web3BookmarkService with wallet address
      try {
        await this.bookmarkService.initializeWithWallet(currentAccount.address as string);
      } catch (error) {
        console.error('❌ Error initializing Web3BookmarkService:', error);
      }
    }

    // ✅ Listen to account changes
    appKit.subscribeAccount(async (account: any) => {
      setTimeout(async () => {
        this.zone.run(() => {
          this.address = account?.address ? (account.address as string) : null;
          this.cdr.detectChanges();
        });

        // Initialize or cleanup bookmark service based on wallet connection
        if (this.address) {
          try {
            await this.bookmarkService.initializeWithWallet(this.address);
          } catch (error) {
            console.error('❌ Error initializing Web3BookmarkService:', error);
          }
        } else {
          this.bookmarkService.cleanup();
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
    this.currentSearchQuery = '';
    this.identityService.clearIdentity();
  }

  handleSearch(query: string): void {
    // Clear any previous search results
    if (!this.address) {
    this.openConnectModal();
    return;
  }
    this.identityService.clearIdentity();

    // Perform the search across all platforms
    this.identityService.searchIdentity(query);
  }

  /**
   * Toggle bookmark - add if not exists, remove if exists
   */
  async toggleBookmark(platform: string, profile: any): Promise<void> {
    if (!this.address) {
      return;
    }

    if (this.pendingBookmarks.has(platform)) {
      return;
    }

    const username = profile.username || profile.handle || 'Unknown';
    const avatar = profile.avatar || profile.pfp_url || '';
    const url = profile.url || profile.profileUrl || '';
    
    // Check if this specific profile is already bookmarked
    const isCurrentlyBookmarked = this.isBookmarked(platform, username);
    
    try {
      // Mark as pending
      this.pendingBookmarks.add(platform);
      this.cdr.detectChanges();

      if (isCurrentlyBookmarked) {
        // Remove bookmark
        await this.bookmarkService.removeBookmark(platform);
      } else {
        // Add bookmark
        await this.bookmarkService.addBookmark(platform, {
          username,
          avatar,
          url
        });
      }
    } catch (error: any) {
      console.error('❌ Error toggling bookmark:', error);
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
    // Navigate to bookmarks page
    this.router.navigate(['/bookmarks']);
  }

  /**
   * Refresh bookmarks from blockchain
   */
  async refreshBookmarks(): Promise<void> {
    try {
      await this.bookmarkService.refreshBookmarks();
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
