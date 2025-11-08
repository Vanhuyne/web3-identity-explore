import { Component } from '@angular/core';
import { BookmarkService } from '../../services/bookmark-service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-bookmarks-views',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './bookmarks-views.html',
  styleUrl: './bookmarks-views.css',
})
export class BookmarksViews {
  constructor(public bookmarkService: BookmarkService) {}

  /**
   * Remove a specific bookmark
   */
  removeBookmark(platform: string): void {
    this.bookmarkService.removeBookmark(platform);
  }

  /**
   * Clear all bookmarks with confirmation
   */
  clearAllBookmarks(): void {
    if (confirm('Are you sure you want to remove all bookmarks? This cannot be undone.')) {
      this.bookmarkService.clearAllBookmarks();
    }
  }

  /**
   * Format timestamp to relative time
   */
  formatDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }
}
