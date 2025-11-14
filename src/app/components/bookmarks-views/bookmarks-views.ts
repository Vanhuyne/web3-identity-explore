import { Component } from '@angular/core';
import { BookmarkedProfile } from '../../services/bookmark-service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { filter, first, firstValueFrom, Observable, Subscription } from 'rxjs';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';

@Component({
  selector: 'app-bookmarks-views',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './bookmarks-views.html',
  styleUrl: './bookmarks-views.css',
})
export class BookmarksViews {
   bookmarks$: Observable<BookmarkedProfile[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  constructor(private bookmarkService: Web3BookmarkService) {
    this.bookmarks$ = this.bookmarkService.bookmarks$;
    this.loading$ = this.bookmarkService.loading$;
    this.error$ = this.bookmarkService.error$;
  }

  ngOnInit() {
    // Tự load khi component render
    if (this.bookmarkService.isInitialized()) {
      this.bookmarkService.refreshBookmarks();
    }
  }
}
