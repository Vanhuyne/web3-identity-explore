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

  handleSearch(query: string): void {
    // Clear any previous search results
    this.identityService.clearIdentity();
    
    // Perform the search across all platforms
    this.identityService.searchIdentity(query);
    
    // Navigate to results page (if you have one)
    // Uncomment this if you want to navigate to a results page
    // this.router.navigate(['/results']);
  }

  // Optional: Handle trending searches
  searchTrending(query: string, platform: string): void {
    // You can implement clicking on trending items to auto-search
    console.log('Trending search:', query, platform);
  }

}
