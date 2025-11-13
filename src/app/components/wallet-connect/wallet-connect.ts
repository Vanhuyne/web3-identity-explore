import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { appKit } from '../../config/wallet.config';
import { CommonModule } from '@angular/common';
import { Web3BookmarkService } from '../../services/web3-bookmark-service';
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
    private cdr: ChangeDetectorRef,
    private bookmarkService: Web3BookmarkService 
  ) {}

  ngOnInit(): void {
    // ✅ Get current session when component initializes
    const currentAccount = appKit.getAccount();
    if (currentAccount?.address) {
      this.zone.run(() => {
        this.address = currentAccount.address as string;
        this.isConnected = true;
        this.cdr.detectChanges();
        // console.log('Wallet already connected:', this.address);

        // ← 3a. Initialize bookmarks when wallet is connected
        this.initializeBookmarkService(this.address);
      });
    }

    // ✅ Listen to account changes
   appKit.subscribeAccount((account: any) => {
      // console.log('Wallet account subscription fired:', account);
      setTimeout(() => {
        this.zone.run(() => {
          this.address = account?.address ? (account.address as string) : null;
          this.isConnected = !!account?.address;
          this.cdr.detectChanges();
          // console.log('Wallet state updated - Connected:', this.isConnected, 'Address:', this.address);
          
          // ← 3b. Handle connection/disconnection
          if (this.address) {
            this.initializeBookmarkService(this.address);
            // console.log('Bookmark service initialized for address:', this.address);
          } else {
            this.bookmarkService.cleanup();
          }
        });
      }, 100);
    });
  }

  ngOnDestroy(): void {
    // Clean up if needed
    // ← 3c. Cleanup on component destroy
    this.bookmarkService.cleanup();
  }

  /**
   * Open the wallet connection modal
   */
  openConnectModal(): void {
    appKit.open();
  }

  // ← 3d. Initialize bookmark service (NEW METHOD)
  private async initializeBookmarkService(address: string): Promise<void> {
    try {
      debugger
      await this.bookmarkService.initializeWithWallet(address);
      // console.log('Bookmark service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize bookmark service:', error);
    }
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
        // console.log('Wallet disconnected');

        // ← 3e. Cleanup on disconnect
        this.bookmarkService.cleanup();
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
      // console.log('Address copied to clipboard');
      // You can add a toast notification here
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }
}
