import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { appKit } from '../../config/wallet.config';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-wallet-connect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-connect.html',
  styleUrl: './wallet-connect.css',
})
export class WalletConnect implements OnInit, OnDestroy {
  address: string | null = null;
  isConnected: boolean = false;

  // Cleanup subject
  private readonly destroy$ = new Subject<void>();

  // Track last processed address to prevent duplicate processing
  private lastProcessedAddress: string | null = null;

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeWalletConnection();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize wallet connection and handle account changes
   */
  private initializeWalletConnection(): void {
    // Check initial connection state
    const currentAccount = appKit.getAccount();
    
    if (currentAccount?.address) {
      this.handleAccountChange(currentAccount.address as string);
    }

    // Subscribe to account changes with debounce to prevent rapid firing
    const accountSubject = new Subject<string | null>();
    
    accountSubject
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(100), // Debounce rapid changes
        distinctUntilChanged() // Only emit when value actually changes
      )
      .subscribe((address) => {
        this.handleAccountChange(address);
      });

    // Listen to wallet account changes
    appKit.subscribeAccount((account: any) => {
      accountSubject.next(account?.address ? (account.address as string) : null);
    });
  }

  /**
   * Handle account changes (connection/disconnection)
   */
  private handleAccountChange(address: string | null): void {
    // Prevent processing same address multiple times
    if (address === this.lastProcessedAddress) {
      return;
    }

    this.lastProcessedAddress = address;

    this.zone.run(() => {
      this.address = address;
      this.isConnected = !!address;
      this.cdr.detectChanges();
    });
  }

  /**
   * Open the wallet connection modal
   */
  openConnectModal(): void {
    appKit.open();
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      await appKit.disconnect();
      
      this.zone.run(() => {
        this.address = null;
        this.isConnected = false;
        this.lastProcessedAddress = null;
        this.cdr.detectChanges();
      });
    } catch (error) {
      console.error('❌ Error disconnecting wallet:', error);
    }
  }

  /**
   * Get shortened address format (0x1234...5678)
   */
  get shortAddress(): string {
    if (!this.address) return '';
    return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
  }

  /**
   * Copy address to clipboard
   */
  async copyAddress(): Promise<void> {
    if (!this.address) return;

    try {
      await navigator.clipboard.writeText(this.address);
    } catch (error) {
      console.error('❌ Failed to copy address:', error);
    }
  }
}