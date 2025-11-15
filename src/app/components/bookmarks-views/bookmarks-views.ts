import { Component } from '@angular/core';
import { BookmarkedProfile } from '../../services/bookmark-service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';

@Component({
  selector: 'app-bookmarks-views',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './bookmarks-views.html',
  styleUrl: './bookmarks-views.css',
})
export class BookmarksViews {
   bookmarks: BookmarkedProfile[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  connectedAddress: string | null = null;
  
  // Filter and sort options
  selectedPlatform: string = 'all';
  sortBy: 'date' | 'platform' | 'username' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  searchQuery: string = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly bookmarkService: Web3BookmarkService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.checkWalletConnection();
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
   * Check if wallet is connected
   */
  private checkWalletConnection(): void {
    if (!this.bookmarkService.isInitialized()) {
      console.warn('⚠️ Wallet not connected, redirecting...');
      // Optionally redirect to home or show connect wallet prompt
      // this.router.navigate(['/']);
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
      });
  }

  /**
   * Get filtered and sorted bookmarks
   */
  get filteredBookmarks(): BookmarkedProfile[] {
    let filtered = [...this.bookmarks];

    // Filter by platform
    if (this.selectedPlatform !== 'all') {
      filtered = filtered.filter(b => b.platform === this.selectedPlatform);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.username.toLowerCase().includes(query) ||
        b.platform.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query)
      );
    }

    // Sort bookmarks
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'date':
          comparison = a.bookmarkedAt - b.bookmarkedAt;
          break;
        case 'platform':
          comparison = a.platform.localeCompare(b.platform);
          break;
        case 'username':
          comparison = a.username.localeCompare(b.username);
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  /**
   * Get unique platforms from bookmarks
   */
  get availablePlatforms(): string[] {
    const platforms = new Set(this.bookmarks.map(b => b.platform));
    return Array.from(platforms).sort();
  }

  /**
   * Handle platform filter change
   */
  onPlatformFilterChange(platform: string): void {
    this.selectedPlatform = platform;
  }

  /**
   * Handle sort change
   */
  onSortChange(sortBy: 'date' | 'platform' | 'username'): void {
    if (this.sortBy === sortBy) {
      // Toggle direction if same sort field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'desc';
    }
  }

  /**
   * Handle search input
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
  }

  /**
   * Refresh bookmarks from blockchain
   */
  async refreshBookmarks(): Promise<void> {
    try {
      await this.bookmarkService.refreshBookmarks();
      console.log('✅ Bookmarks refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing bookmarks:', error);
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(platform: string): Promise<void> {
    if (!confirm(`Are you sure you want to remove ${platform} from bookmarks?`)) {
      return;
    }

    try {
      await this.bookmarkService.removeBookmark(platform);
      console.log('✅ Bookmark removed successfully');
    } catch (error) {
      console.error('❌ Error removing bookmark:', error);
      alert('Failed to remove bookmark. Please try again.');
    }
  }

  /**
   * Navigate to profile URL
   */
  openProfile(bookmark: BookmarkedProfile): void {
    if (bookmark.url) {
      window.open(bookmark.url, '_blank');
    }
  }

  /**
   * Format timestamp to readable date
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get platform icon/emoji
   */
  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      'twitter': '𝕏',
      'github': '⚙️',
      'linkedin': '💼',
      'instagram': '📷',
      'facebook': '👥',
      'youtube': '▶️',
      'tiktok': '🎵',
      'discord': '💬',
      'telegram': '✈️',
      'reddit': '🤖',
    };
    return icons[platform.toLowerCase()] || '🔖';
  }

  /**
   * Get shortened address
   */
  get shortAddress(): string {
    if (!this.connectedAddress) return '';
    return `${this.connectedAddress.slice(0, 6)}...${this.connectedAddress.slice(-4)}`;
  }

  /**
   * Copy address to clipboard
   */
  async copyAddress(): Promise<void> {
    if (!this.connectedAddress) return;
    
    try {
      await navigator.clipboard.writeText(this.connectedAddress);
      console.log('📋 Address copied');
    } catch (error) {
      console.error('❌ Failed to copy address:', error);
    }
  }

  /**
   * Get empty state message
   */
  get emptyStateMessage(): string {
    if (this.searchQuery) {
      return `No bookmarks found matching "${this.searchQuery}"`;
    }
    if (this.selectedPlatform !== 'all') {
      return `No bookmarks found for ${this.selectedPlatform}`;
    }
    return 'No bookmarks yet. Start exploring and bookmark profiles!';
  }

  /**
   * TrackBy function for ngFor optimization
   */
  trackByPlatform(index: number, bookmark: BookmarkedProfile): string {
    return bookmark.platform;
  }
}
