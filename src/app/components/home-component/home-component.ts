import { Component } from '@angular/core';
import { SearchBarComponent } from '../search-bar-component/search-bar-component';
import { IdentityService } from '../../services/identity-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SearchQuery } from '../../models/search';

@Component({
  selector: 'app-home-component',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchBarComponent],
  templateUrl: './home-component.html',
  styleUrl: './home-component.css',
})
export class HomeComponent {
  constructor(
    public identityService: IdentityService,
    private router: Router
  ) {}

  currentSearchQuery: string = '';

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


}
