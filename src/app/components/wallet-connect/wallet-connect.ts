import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { appKit } from '../../config/wallet.config';
import { CommonModule } from '@angular/common';
// import { Web3Service } from '../../services/web3-service';

@Component({
  selector: 'app-wallet-connect',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-connect.html',
  styleUrl: './wallet-connect.css',
})
export class WalletConnect implements OnInit, OnDestroy{
  address: string | null = null;
  isConnected: boolean = false;

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ✅ Get current session when component initializes
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      this.zone.run(() => {
        this.address = currentAccount.address as string;
        this.isConnected = true;
        this.cdr.detectChanges();
        console.log('Wallet already connected:', this.address);
      });
    }

    // ✅ Listen to account changes
    appKit.subscribeAccount((account: any) => {
      console.log('Wallet account subscription fired:', account);
      // Small delay to ensure modal closes before updating UI
      setTimeout(() => {
        this.zone.run(() => {
          this.address = account?.address ? (account.address as string) : null;
          this.isConnected = !!account?.address;
          this.cdr.detectChanges();
          console.log('Wallet state updated - Connected:', this.isConnected, 'Address:', this.address);
        });
      }, 100);
    });
  }

  ngOnDestroy(): void {
    // Clean up if needed
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
        this.cdr.detectChanges();
        console.log('Wallet disconnected');
      });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
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
      console.log('Address copied to clipboard');
      // You can add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }
}
