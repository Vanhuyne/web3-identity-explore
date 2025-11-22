import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { appKit } from '../config/wallet.config';

export interface BookmarkedProfile {
  platform: string;
  username: string;
  avatar?: string;
  url: string;
  bookmarkedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  private readonly STORAGE_KEY = 'web3_identity_bookmarks';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private bookmarksSubject = new BehaviorSubject<BookmarkedProfile[]>([]);
  public bookmarks$: Observable<BookmarkedProfile[]> = this.bookmarksSubject.asObservable();
  
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$ = this.errorSubject.asObservable();
  
  private lastCacheTime = 0;
  private walletAddress: string | null = null;

  constructor() {
    this.initializeFromLocalStorage();
  }

  /**
   * Initialize service with wallet address
   */
  async initializeWithWallet(address: string): Promise<void> {
    this.walletAddress = address;
    console.log('💼 Web3BookmarkService initialized with wallet:', address);
    
    // Load bookmarks from localStorage
    this.initializeFromLocalStorage();
    
    // Optionally fetch from smart contract if needed
    await this.refreshBookmarks();
  }

  /**
   * Initialize bookmarks from localStorage
   */
  private initializeFromLocalStorage(): void {
    try {
      const walletKey = this.getStorageKey();
      const stored = localStorage.getItem(walletKey);
      
      if (stored) {
        const bookmarks = JSON.parse(stored) as BookmarkedProfile[];
        this.bookmarksSubject.next(bookmarks);
        console.log('✅ Loaded bookmarks from localStorage:', bookmarks.length);
      } else {
        this.bookmarksSubject.next([]);
      }
    } catch (error) {
      console.error('❌ Error loading bookmarks from localStorage:', error);
      this.bookmarksSubject.next([]);
    }
  }

  /**
   * Get storage key based on wallet address
   */
  private getStorageKey(): string {
    return this.walletAddress 
      ? `${this.STORAGE_KEY}_${this.walletAddress}` 
      : this.STORAGE_KEY;
  }

  /**
   * Save bookmarks to localStorage
   */
  private saveToLocalStorage(bookmarks: BookmarkedProfile[]): void {
    try {
      const walletKey = this.getStorageKey();
      localStorage.setItem(walletKey, JSON.stringify(bookmarks));
      this.bookmarksSubject.next(bookmarks);
      console.log('💾 Bookmarks saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving bookmarks to localStorage:', error);
      this.errorSubject.next('Failed to save bookmarks');
    }
  }

  /**
   * Add a bookmark with Web3 transaction
   */
  async addBookmark(platform: string, profile: {
    username: string;
    avatar?: string;
    url: string;
  }): Promise<void> {
    if (!this.walletAddress) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const currentBookmarks = this.bookmarksSubject.value;
      
      // Check if already bookmarked
      const exists = currentBookmarks.some(
        b => b.platform.toLowerCase() === platform.toLowerCase() &&
             b.username.toLowerCase() === profile.username.toLowerCase()
      );
      
      if (exists) {
        throw new Error(`${profile.username} is already bookmarked`);
      }

      // Create bookmark object
      const newBookmark: BookmarkedProfile = {
        platform,
        username: profile.username,
        avatar: profile.avatar || '',
        url: profile.url || '',
        bookmarkedAt: Date.now()
      };

      // Here you would integrate with your smart contract
      // Example: const tx = await this.saveToBlockchain(newBookmark);
      // newBookmark.txHash = tx.transactionHash;

      // Save locally
      const updatedBookmarks = [...currentBookmarks, newBookmark];
      this.saveToLocalStorage(updatedBookmarks);
      
      console.log('✅ Bookmark added:', newBookmark);
    } catch (error: any) {
      console.error('❌ Error adding bookmark:', error);
      this.errorSubject.next(error.message || 'Failed to add bookmark');
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Remove a bookmark by platform
   */
  async removeBookmark(platform: string): Promise<void> {
    if (!this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const currentBookmarks = this.bookmarksSubject.value;
      
      const updatedBookmarks = currentBookmarks.filter(
        b => b.platform.toLowerCase() !== platform.toLowerCase()
      );

      // Here you would integrate with your smart contract to remove
      // Example: await this.removeFromBlockchain(platform);

      this.saveToLocalStorage(updatedBookmarks);
      console.log('✅ Bookmark removed');
    } catch (error: any) {
      console.error('❌ Error removing bookmark:', error);
      this.errorSubject.next(error.message || 'Failed to remove bookmark');
      throw error;
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Check if a profile is bookmarked (synchronous)
   */
  isBookmarked(platform: string, username?: string): boolean {
    const bookmarks = this.bookmarksSubject.value;
    
    if (!username) {
      return bookmarks.some(b => b.platform.toLowerCase() === platform.toLowerCase());
    }
    
    return bookmarks.some(
      b => b.platform.toLowerCase() === platform.toLowerCase() &&
           b.username.toLowerCase() === username.toLowerCase()
    );
  }

  /**
   * Get all bookmarks
   */
  getAllBookmarks(): BookmarkedProfile[] {
    return this.bookmarksSubject.value;
  }

  /**
   * Get bookmarks by platform
   */
  getBookmarksByPlatform(platform: string): BookmarkedProfile[] {
    return this.bookmarksSubject.value.filter(
      b => b.platform.toLowerCase() === platform.toLowerCase()
    );
  }

  /**
   * Get bookmarks count
   */
  getBookmarksCount(): number {
    return this.bookmarksSubject.value.length;
  }

  /**
   * Clear all bookmarks
   */
  async clearAllBookmarks(): Promise<void> {
    try {
      const walletKey = this.getStorageKey();
      localStorage.removeItem(walletKey);
      this.bookmarksSubject.next([]);
      console.log('🧹 All bookmarks cleared');
    } catch (error) {
      console.error('❌ Error clearing bookmarks:', error);
      this.errorSubject.next('Failed to clear bookmarks');
      throw error;
    }
  }

  /**
   * Refresh bookmarks from blockchain/storage
   */
  async refreshBookmarks(): Promise<void> {
    const now = Date.now();
    
    // Prevent excessive refreshing
    if (now - this.lastCacheTime < this.CACHE_DURATION) {
      console.log('⏭️ Using cached bookmarks');
      return;
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      // Load from localStorage (primary source)
      this.initializeFromLocalStorage();
      
      // Here you would fetch from blockchain if needed
      // Example: const blockchainBookmarks = await this.fetchFromBlockchain();
      // Then merge or validate against blockchain

      this.lastCacheTime = now;
      console.log('🔄 Bookmarks refreshed');
    } catch (error: any) {
      console.error('❌ Error refreshing bookmarks:', error);
      this.errorSubject.next(error.message || 'Failed to refresh bookmarks');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Export bookmarks as JSON
   */
  exportBookmarks(): string {
    return JSON.stringify(this.bookmarksSubject.value, null, 2);
  }

  /**
   * Import bookmarks from JSON
   */
  async importBookmarks(jsonData: string): Promise<void> {
    try {
      const bookmarks = JSON.parse(jsonData) as BookmarkedProfile[];
      
      // Validate structure
      if (!Array.isArray(bookmarks)) {
        throw new Error('Invalid bookmarks format');
      }

      bookmarks.forEach(b => {
        if (!b.platform || !b.username || !b.url) {
          throw new Error('Invalid bookmark structure');
        }
      });

      this.saveToLocalStorage(bookmarks);
      console.log('✅ Bookmarks imported successfully');
    } catch (error: any) {
      console.error('❌ Error importing bookmarks:', error);
      this.errorSubject.next(error.message || 'Failed to import bookmarks');
      throw error;
    }
  }

  /**
   * Get bookmark statistics
   */
  getStats(): {
    totalBookmarks: number;
    platformStats: Record<string, number>;
  } {
    const bookmarks = this.bookmarksSubject.value;
    const platformStats: Record<string, number> = {};
    
    bookmarks.forEach(b => {
      platformStats[b.platform] = (platformStats[b.platform] || 0) + 1;
    });

    return {
      totalBookmarks: bookmarks.length,
      platformStats
    };
  }

  /**
   * Cleanup service (called when wallet disconnects)
   */
  cleanup(): void {
    this.walletAddress = null;
    this.bookmarksSubject.next([]);
    this.errorSubject.next(null);
    this.loadingSubject.next(false);
    console.log('🧹 Web3BookmarkService cleaned up');
  }
}