import { Component, EventEmitter, Output } from '@angular/core';
import { SearchPlatform, SearchQuery } from '../../models/search';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar-component.html',
  styleUrl: './search-bar-component.css',
})
export class SearchBarComponent {
  @Output() search = new EventEmitter<string>();

  searchQuery: string = '';

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery.trim());
    }
  }
}
