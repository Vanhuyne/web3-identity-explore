import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
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
  @Output() clear = new EventEmitter<void>();
  @Input() searchQuery: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    // Update local searchQuery when input changes (e.g., from trending clicks)
    if (changes['searchQuery']) {
      this.searchQuery = changes['searchQuery'].currentValue || '';
    }
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery.trim());
    }
  }

  onClear(): void {
    this.searchQuery = '';
    this.clear.emit();
  }

  isSearchDisabled(): boolean {
    return !this.searchQuery || this.searchQuery.trim().length === 0;
  }
}
