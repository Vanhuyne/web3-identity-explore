import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
  private bookmarksSubject = new BehaviorSubject<BookmarkedProfile[]>([]);
  public bookmarks$: Observable<BookmarkedProfile[]> = this.bookmarksSubject.asObservable();

  constructor() {
    this.loadBookmarks();
  }

  /**
   * Load bookmarks from localStorage
   */
  private loadBookmarks(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const bookmarks = JSON.parse(stored) as BookmarkedProfile[];
        this.bookmarksSubject.next(bookmarks);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      this.bookmarksSubject.next([]);
    }
  }

  /**
   * Save bookmarks to localStorage
   */
  private saveBookmarks(bookmarks: BookmarkedProfile[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
      this.bookmarksSubject.next(bookmarks);
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }

  /**
   * Add a bookmark
   */
  addBookmark(platform: string, profile: any): void {
    const currentBookmarks = this.bookmarksSubject.value;
    
    // Check if already bookmarked
    const exists = currentBookmarks.some(b => b.platform === platform);
    if (exists) {
      console.warn(`${platform} is already bookmarked`);
      return;
    }

    const newBookmark: BookmarkedProfile = {
      platform,
      username: profile.username || profile.handle || 'Unknown',
      avatar: profile.avatar,
      url: profile.url,
      bookmarkedAt: Date.now()
    };

    const updatedBookmarks = [...currentBookmarks, newBookmark];
    this.saveBookmarks(updatedBookmarks);
  }

  /**
   * Remove a bookmark
   */
  removeBookmark(platform: string): void {
    const currentBookmarks = this.bookmarksSubject.value;
    const updatedBookmarks = currentBookmarks.filter(b => b.platform !== platform);
    this.saveBookmarks(updatedBookmarks);
  }

  /**
   * Toggle bookmark (add if not exists, remove if exists)
   */
  toggleBookmark(platform: string, profile: any): void {
    if (this.isBookmarked(platform)) {
      this.removeBookmark(platform);
    } else {
      this.addBookmark(platform, profile);
    }
  }

  /**
   * Check if a platform is bookmarked
   */
  isBookmarked(platform: string): boolean {
    return this.bookmarksSubject.value.some(b => b.platform === platform);
  }

  /**
   * Get all bookmarks
   */
  getAllBookmarks(): BookmarkedProfile[] {
    return this.bookmarksSubject.value;
  }

  /**
   * Get bookmark by platform
   */
  getBookmark(platform: string): BookmarkedProfile | undefined {
    return this.bookmarksSubject.value.find(b => b.platform === platform);
  }

  /**
   * Clear all bookmarks
   */
  clearAllBookmarks(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.bookmarksSubject.next([]);
  }

  /**
   * Get bookmarks count
   */
  getBookmarksCount(): number {
    return this.bookmarksSubject.value.length;
  }

}
