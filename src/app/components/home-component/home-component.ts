import { Component, NgZone, OnInit } from '@angular/core';
import { SearchBarComponent } from '../search-bar-component/search-bar-component';
import { IdentityService } from '../../services/identity-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BookmarkService } from '../../services/bookmark-service';
import { appKit } from '../../config/wallet.config';

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBarComponent, RouterLink],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
  address: string | null = null;

  constructor(
    public identityService: IdentityService,
    private router: Router,
    public bookmarkService: BookmarkService,
    private zone: NgZone
  ) {
     // ✅ Lấy lại session khi app khởi động
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      this.address = currentAccount.address;
      console.log('Restored session with address:', this.address);
    }

     // Lắng nghe sự thay đổi tài khoản
    appKit.subscribeAccount((account: any) => {
      this.zone.run(() => {
        this.address = account?.address ?? null;
      });
    });
    
  }

  ngOnInit(): void {
    // Subscribe to bookmarks if needed for other functionality
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookmarks) => {
        console.log('Current bookmarks:', bookmarks);
      });

   
  }

  openConnectModal() {
    appKit.open();
  }

  get shortAddress() {
    if (!this.address) return '';
    return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
  }

  currentSearchQuery: string = '';
  private destroy$ = new Subject<void>();

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
   * Toggle bookmark for a platform
   */
  toggleBookmark(platform: string, profile: any): void {
    this.bookmarkService.toggleBookmark(platform, profile);

    // Optional: Show a toast notification
    const isNowBookmarked = this.bookmarkService.isBookmarked(platform);
    console.log(
      isNowBookmarked
        ? `✓ Bookmarked ${profile.username}`
        : `✗ Removed bookmark for ${profile.username}`
    );
  }

  /**
   * Check if a platform is bookmarked
   */
  isBookmarked(platform: string): boolean {
    return this.bookmarkService.isBookmarked(platform);
  }

  /**
   * Get all bookmarks (useful for displaying a bookmarks list)
   */
  viewAllBookmarks(): void {
    const bookmarks = this.bookmarkService.getAllBookmarks();
    console.log('All bookmarks:', bookmarks);
    // You can navigate to a bookmarks page or open a modal here
  }

  /**
   * Clear all bookmarks
   */
  clearAllBookmarks(): void {
    if (confirm('Are you sure you want to clear all bookmarks?')) {
      this.bookmarkService.clearAllBookmarks();
      console.log('All bookmarks cleared');
    }
  }
}
