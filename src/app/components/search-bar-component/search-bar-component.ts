import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
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
  @Output() connectWallet = new EventEmitter<void>();
  @Input() searchQuery: string = '';
  @Output() searchQueryChange = new EventEmitter<string>(); // Add this for two-way binding
  @Input() isWalletConnected: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    // Update local searchQuery when input changes (e.g., from trending clicks)
    if (changes['searchQuery']) {
      this.searchQuery = changes['searchQuery'].currentValue || '';
    }
  }

  onSearch(): void {
    if (!this.isWalletConnected) {
      this.connectWallet.emit();
      return;
    }

    if (this.searchQuery.trim()) {
      this.search.emit(this.searchQuery.trim());
    }
  }

  onClear(): void {
    this.searchQuery = '';
    this.searchQueryChange.emit(this.searchQuery); // Emit the change for two-way binding
    this.clear.emit();
  }

  onInputChange(): void {
    this.searchQueryChange.emit(this.searchQuery); // Emit changes as user types
  }

  isSearchDisabled(): boolean {
    return !this.searchQuery || this.searchQuery.trim().length === 0;
  }
}
