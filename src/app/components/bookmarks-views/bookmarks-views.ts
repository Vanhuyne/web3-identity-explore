import { ChangeDetectorRef, Component } from '@angular/core';
import { BookmarkedProfile, BookmarkService } from '../../services/bookmark-service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
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
  filteredBookmarks: BookmarkedProfile[] = [];
  selectedPlatform: string = 'all';
  searchQuery: string = '';
  private destroy$ = new Subject<void>();
  
  // Platform filter options
  platforms = ['all', 'farcaster', 'ens', 'twitter', 'github', 'zora', 'lens'];
  
  // Platform colors
  platformColors: Record<string, string> = {
    farcaster: 'purple',
    ens: 'blue',
    twitter: 'sky',
    github: 'gray',
    zora: 'pink',
    lens: 'green'
  };

  constructor(
    public bookmarkService: BookmarkService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to bookmarks
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookmarks) => {
        console.log('Bookmarks updated:', bookmarks);
        this.bookmarks = bookmarks;
        this.applyFilters();
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Apply filters based on platform and search query
   */
  applyFilters(): void {
    let filtered = [...this.bookmarks];

    // Filter by platform
    if (this.selectedPlatform !== 'all') {
      filtered = filtered.filter(
        b => b.platform.toLowerCase() === this.selectedPlatform.toLowerCase()
      );
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.username.toLowerCase().includes(query) ||
        b.platform.toLowerCase().includes(query)
      );
    }

    this.filteredBookmarks = filtered;
    this.cdr.detectChanges();
  }

  /**
   * Handle platform filter change
   */
  onPlatformChange(platform: string): void {
    this.selectedPlatform = platform;
    this.applyFilters();
  }

  /**
   * Handle search input
   */
  onSearch(query: string): void {
    this.searchQuery = query;
    this.applyFilters();
  }

  /**
   * Get platform display name
   */
  getPlatformDisplayName(platform: string): string {
    const names: Record<string, string> = {
      farcaster: 'Farcaster',
      ens: 'ENS',
      twitter: 'Twitter',
      github: 'GitHub',
      zora: 'Zora',
      lens: 'Lens Protocol'
    };
    return names[platform.toLowerCase()] || platform;
  }

  /**
   * Get platform icon class
   */
  getPlatformIcon(platform: string): string {
    const icons: Record<string, string> = {
      farcaster: 'fa-broadcast-tower',
      ens: 'fa-ethereum',
      twitter: 'fa-twitter',
      github: 'fa-github',
      zora: 'fa-palette',
      lens: 'fa-leaf'
    };
    return icons[platform.toLowerCase()] || 'fa-bookmark';
  }

  /**
   * Get color classes for platform
   */
  getColorClasses(platform: string): { bg: string; text: string; border: string; icon: string } {
    const color = this.platformColors[platform.toLowerCase()] || 'gray';
    return {
      bg: `bg-${color}-50`,
      text: `text-${color}-900`,
      border: `border-${color}-200`,
      icon: `text-${color}-600`
    };
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(bookmark: BookmarkedProfile): Promise<void> {
    try {
      // Remove by platform (the bookmark service uses platform as the key)
      await this.bookmarkService.removeBookmark(bookmark.platform);
      console.log('✅ Bookmark removed:', bookmark.username);
    } catch (error: any) {
      console.error('Error removing bookmark:', error);
    }
  }

  /**
   * Open bookmark in new tab
   */
  openBookmark(url: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  /**
   * Copy profile URL to clipboard
   */
  async copyToClipboard(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }

  /**
   * Clear all bookmarks
   */
  async clearAllBookmarks(): Promise<void> {
    try {
      await this.bookmarkService.clearAllBookmarks();
    } catch (error: any) {
      console.error('Error clearing bookmarks:', error);
    }
  }

  /**
   * Get bookmarks count by platform
   */
  getCountByPlatform(platform: string): number {
    if (platform === 'all') return this.bookmarks.length;
    return this.bookmarks.filter(
      b => b.platform.toLowerCase() === platform.toLowerCase()
    ).length;
  }

  /**
   * Format date
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
}
