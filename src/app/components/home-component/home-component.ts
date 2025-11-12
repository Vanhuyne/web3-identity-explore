import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { SearchBarComponent } from '../search-bar-component/search-bar-component';
import { IdentityService } from '../../services/identity-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BookmarkService } from '../../services/bookmark-service';
import { appKit } from '../../config/wallet.config';
import { WalletConnect } from "../wallet-connect/wallet-connect";

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBarComponent, RouterLink, WalletConnect],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
 address: string | null = null;
  currentSearchQuery: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    public identityService: IdentityService,
    private router: Router,
    public bookmarkService: BookmarkService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to bookmarks if needed for other functionality
    this.bookmarkService.bookmarks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookmarks) => {
        console.log('Current bookmarks:', bookmarks);
      });

    // ✅ Get current session when app starts
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      this.zone.run(() => {
        this.address = currentAccount.address as string;
        this.cdr.detectChanges();
        console.log('Restored session with address:', this.address);
      });
    }

    // ✅ Listen to account changes
    appKit.subscribeAccount((account: any) => {
      console.log('Account subscription fired:', account);
      // Use setTimeout to ensure the update happens after the modal closes
      setTimeout(() => {
        this.zone.run(() => {
          this.address = account?.address ? (account.address as string) : null;
          this.cdr.detectChanges();
          console.log('Account changed:', this.address);
        });
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
