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
  imports: [FormsModule,CommonModule],
  templateUrl: './reputation.html',
  styleUrl: './reputation.css',
})
export class Reputation implements OnInit {

  searchAddress: string = '';
  targetAddress: string = '';

  averageScore: number = 0;
  reviewCount: number = 0;
  reviews: Review[] = [];

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';

  newReview = {
    message: '',
    score: 0
  };

  Math = Math;
  constructor(private reputationService: ReputationService ) {}

  ngOnInit(): void {

    if (this.targetAddress) {
      this.loadReputationData();
      
    }
  }

  async searchReputation(): Promise<void> {
    const address = this.searchAddress.trim();

    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      this.errorMessage = 'Please enter a valid Ethereum address (0x...)';
      return;
    }

    this.targetAddress = address;
    this.resetForm();
    await this.loadReputationData();
  }

  async loadReputationData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Load average score
      this.averageScore = await this.reputationService.getAverageScore(
        this.targetAddress
      );

      // Load review count
      this.reviewCount = await this.reputationService.getReviewCount(
        this.targetAddress
      );

      // Load all reviews only if there are any
      if (this.reviewCount > 0) {
        this.reviews = await this.reputationService.getAllNotes(
          this.targetAddress
        );
      } else {
        this.reviews = [];
      }
    } catch (error) {
      this.errorMessage = 'Failed to load reputation data. Please try again.';
      console.error('Error loading reputation:', error);
      this.targetAddress = '';
    } finally {
      this.isLoading = false;
    }
  }

 async submitReview(): Promise<void> {
    if (!this.newReview.message || this.newReview.score === 0) {
      this.errorMessage = 'Please provide a message and rating.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      await this.reputationService.addNote(
        this.targetAddress,
        this.newReview.message,
        this.newReview.score
      );

      // Reset form
      this.resetForm();

      // Reload data
      await this.loadReputationData();
    } catch (error) {
      this.errorMessage = 'Failed to submit review. Please try again.';
      console.error('Error submitting review:', error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private resetForm(): void {
    this.newReview = { message: '', score: 0 };
  }

  clearError(): void {
    this.errorMessage = '';
  }

}
