import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { sdk } from '@farcaster/miniapp-sdk';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected title = 'web3-identity-explorer';

  async ngOnInit() {
    // Gọi ngay sau khi ứng dụng sẵn sàng để hiển thị
    await sdk.actions.ready();
  }
}
