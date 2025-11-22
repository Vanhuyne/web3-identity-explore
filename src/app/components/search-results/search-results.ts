import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupedIdentity } from '../../models/identity';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-results.html',
  styleUrl: './search-results.css',
})
export class SearchResults {
  @Input() identity: GroupedIdentity | null = null;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;
  
  @Output() toggleBookmark = new EventEmitter<{ platform: string; profile: any }>();
  
  @Input() isBookmarked!: (platform: string, username?: string) => boolean;
  @Input() isBookmarkPending!: (platform: string) => boolean;

  onToggleBookmark(platform: string, profile: any): void {
    this.toggleBookmark.emit({ platform, profile });
  }
}
