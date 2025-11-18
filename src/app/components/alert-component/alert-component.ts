import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type AlertType = 'loading' | 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-alert-component',
  imports: [CommonModule],
  templateUrl: './alert-component.html',
  styleUrl: './alert-component.css',
})
export class AlertComponent {
  @Input() type: AlertType = 'info';
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() txHash: string = '';
  @Input() show: boolean = false;
  @Input() dismissible: boolean = true;
  @Input() autoDismiss: number = 0; // Auto dismiss after X ms (0 = no auto dismiss)
  
  isClosing: boolean = false;
  private dismissTimer: any;

  ngOnChanges(): void {
    if (this.show && this.autoDismiss > 0) {
      this.startAutoDismiss();
    }
  }

  ngOnDestroy(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  private startAutoDismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
    
    this.dismissTimer = setTimeout(() => {
      this.close();
    }, this.autoDismiss);
  }

  close(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.show = false;
      this.isClosing = false;
    }, 300);
  }
}
