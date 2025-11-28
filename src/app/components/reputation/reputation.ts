import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReputationService } from '../../services/reputation-service';

interface Review {
  reviewer: string;
  message: string;
  score: number;
  timestamp: Date;
}

@Component({
  selector: 'app-reputation',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './reputation.html',
  styleUrl: './reputation.css',
})
export class Reputation implements OnInit {
  // Search state
  searchAddress: string = '';
  targetAddress: string = '';

  // Data state
  averageScore: number = 0;
  reviewCount: number = 0;
  reviews: Review[] = [];

  // UI state
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Form state
  newReview = {
    message: '',
    score: 0
  };

  Math = Math;

  constructor(private reputationService: ReputationService) {}

  ngOnInit(): void {
    // Component initializes, no auto-load needed

  }

  /**
   * Validate Ethereum address format
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Search for a wallet address and load its reputation data
   */
  async searchReputation(): Promise<void> {
    const address = this.searchAddress.trim();
    debugger
    // Clear previous messages
    this.errorMessage = '';
    this.successMessage = '';

    // Validate address
    if (!address) {
      this.errorMessage = 'Please enter a wallet address';
      return;
    }

    if (!this.isValidAddress(address)) {
      this.errorMessage = 'Invalid address format. Please enter a valid Ethereum address (0x...)';
      return;
    }

    // Set target and load data
    this.targetAddress = address;
    this.resetForm();
    this.reviews = []; // Clear reviews immediately
    await this.loadReputationData();
  }

  /**
   * Load reputation data for the target address
   */
  async loadReputationData(): Promise<void> {
    if (!this.targetAddress) {
      this.errorMessage = 'No address to load';
      return;
    }

    
    this.errorMessage = '';
    this.reviews = []; // Ensure reviews array is cleared
    this.isLoading = true;
    console.log(this.isLoading);
    

    try {
      // Fetch all data concurrently
      const [scoreResult, countResult, reviewsResult] = await Promise.all([
        this.reputationService.getAverageScore(this.targetAddress),
        this.reputationService.getReviewCount(this.targetAddress),
        this.reputationService.getAllNotes(this.targetAddress)
      ]);
      
      this.averageScore = scoreResult
      this.reviewCount = countResult
      this.reviews = reviewsResult 
      

      console.log(this.reviews);
      console.log(this.reviewCount);
    } catch (error) {
      console.error('Error loading reputation data:', error);
      this.errorMessage = 'Failed to load reputation data. Please try again.';
      this.resetData();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Submit a new review for the target address
   */
  async submitReview(): Promise<void> {
    // Validate form
    if (!this.newReview.message.trim()) {
      this.errorMessage = 'Please write a review message';
      return;
    }

    if (this.newReview.score === 0) {
      this.errorMessage = 'Please select a rating';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // Submit review to service
      await this.reputationService.addNote(
        this.targetAddress,
        this.newReview.message.trim(),
        this.newReview.score
      );

      // Show success message
      this.successMessage = 'Review submitted successfully!';

      // Clear form
      this.resetForm();

      // Reload data to show the new review
      await this.loadReputationData();

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error) {
      console.error('Error submitting review:', error);
      this.errorMessage = 'Failed to submit review. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = '';
  }

  /**
   * Clear success message
   */
  clearSuccess(): void {
    this.successMessage = '';
  }

  /**
   * Reset form fields
   */
  private resetForm(): void {
    this.newReview = { message: '', score: 0 };
  }

  /**
   * Reset all data (used on error)
   */
  private resetData(): void {
    this.targetAddress = '';
    this.reviews = [];
    this.averageScore = 0;
    this.reviewCount = 0;
  }

  /**
   * Clear all search and start over
   */
  clearSearch(): void {
    this.searchAddress = '';
    this.resetData();
    this.resetForm();
    this.errorMessage = '';
    this.successMessage = '';
  }
}
