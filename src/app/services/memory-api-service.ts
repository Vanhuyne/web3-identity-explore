import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { catchError, Observable, throwError } from 'rxjs';
import { IdentityProfile } from '../models/identity';

@Injectable({
  providedIn: 'root'
})
export class MemoryApiService {
  private readonly baseUrl = 'https://api.memoryproto.co/identities';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${environment.apis.memoryProtocol}`
    });
  }

  // Search by wallet address
  getIdentityByWallet(address: string): Observable<IdentityProfile[]> {
    return this.http.get<IdentityProfile[]>(`${this.baseUrl}/wallet/${address}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Search by Farcaster username
  getIdentityByFarcasterUsername(username: string): Observable<IdentityProfile[]> {
    return this.http.get<IdentityProfile[]>(`${this.baseUrl}/farcaster/username/${username}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Search by Farcaster FID
  getIdentityByFarcasterFid(fid: string): Observable<IdentityProfile[]> {
    return this.http.get<IdentityProfile[]>(`${this.baseUrl}/farcaster/fid/${fid}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Search by Twitter username
  getIdentityByTwitter(username: string): Observable<IdentityProfile[]> {
    return this.http.get<IdentityProfile[]>(`${this.baseUrl}/twitter/${username}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Search by Zora username
  getIdentityByZora(username: string): Observable<IdentityProfile[]> {
    return this.http.get<IdentityProfile[]>(`${this.baseUrl}/zora/${username}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    let errorMessage = 'Failed to fetch identity';
    
    if (error.status === 404) {
      errorMessage = 'Identity not found';
    } else if (error.status === 401) {
      errorMessage = 'Invalid API token';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
