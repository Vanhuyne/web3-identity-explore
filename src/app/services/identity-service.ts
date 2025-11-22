import { Injectable } from '@angular/core';
import { GroupedIdentity, IdentityProfile } from '../models/identity';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of } from 'rxjs';
import { MemoryApiService } from './memory-api-service';
import { SearchPlatform, SearchQuery } from '../models/search';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {
  private identitySubject = new BehaviorSubject<GroupedIdentity | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  identity$ = this.identitySubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private memoryApi: MemoryApiService) {}

  searchIdentity(query: string): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Detect query type and search appropriate platforms
    const searchObservables = this.getSearchObservables(query);

    // Execute all searches in parallel
    forkJoin(searchObservables).pipe(
      map(results => {
        // Flatten all results into a single array
        const allProfiles = results.flat();
        
        if (allProfiles.length === 0) {
          throw new Error('No identity found across any platform');
        }
        
        return this.groupProfiles(allProfiles);
      })
    ).subscribe({
      next: (identity) => {
        this.identitySubject.next(identity);
        this.loadingSubject.next(false);
      },
      error: (error) => {
        this.errorSubject.next(error.message || 'Failed to fetch identity');
        this.loadingSubject.next(false);
      }
    });
  }

  private getSearchObservables(query: string): Observable<IdentityProfile[]>[] {
    const observables: Observable<IdentityProfile[]>[] = [];

    // Check if it's a wallet address (starts with 0x)
    if (query.startsWith('0x')) {
      observables.push(
        this.memoryApi.getIdentityByWallet(query).pipe(
          catchError(() => of([]))
        )
      );
    }

    // Check if it's a FID (only numbers)
    if (/^\d+$/.test(query)) {
      observables.push(
        this.memoryApi.getIdentityByFarcasterFid(query).pipe(
          catchError(() => of([]))
        )
      );
    }

    // Always search by username on all platforms
    // Remove @ symbol if present (for Twitter)
    const username = query.replace('@', '');

    observables.push(
      this.memoryApi.getIdentityByFarcasterUsername(username).pipe(
        catchError(() => of([]))
      ),
      this.memoryApi.getIdentityByTwitter(username).pipe(
        catchError(() => of([]))
      ),
      this.memoryApi.getIdentityByZora(username).pipe(
        catchError(() => of([]))
      )
    );

    return observables;
  }

  private groupProfiles(profiles: IdentityProfile[]): GroupedIdentity {
    const grouped: GroupedIdentity = {
      primary: profiles[0] || null,
      farcaster: null,
      ens: null,
      github: null,
      twitter: null,
      zora: null,
      lens: null,
      telegram: null,
      allProfiles: profiles
    };

    profiles.forEach(profile => {
      switch (profile.platform.toLowerCase()) {
        case 'farcaster':
          grouped.farcaster = profile;
          break;
        case 'ens':
          grouped.ens = profile;
          break;
        case 'github':
          grouped.github = profile;
          break;
        case 'twitter':
          grouped.twitter = profile;
          break;
        case 'zora':
          grouped.zora = profile;
          break;
        case 'lens':
          grouped.lens = profile;
          break;
        case 'telegram':
          grouped.telegram = profile;
          break;
      }
    });

    return grouped;
  }

  clearIdentity(): void {
    this.identitySubject.next(null);
    this.errorSubject.next(null);
  }
}
