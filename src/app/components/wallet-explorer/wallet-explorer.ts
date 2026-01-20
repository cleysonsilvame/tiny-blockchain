import { Component, signal, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Blockchain } from '../../services/blockchain.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-wallet-explorer',
  imports: [FormsModule],
  templateUrl: './wallet-explorer.html',
  styleUrl: './wallet-explorer.css',
})
export class WalletExplorer {
  blockchainService = inject(Blockchain);
  walletService = inject(WalletService);

  searchAddress = signal<string>('');
  selectedAddress = signal<string | null>(null);

  allAddresses = computed(() => this.walletService.getAllAddresses());

  balance = computed(() => {
    const addr = this.selectedAddress();
    return addr ? this.walletService.getBalance(addr) : 0;
  });

  history = computed(() => {
    const addr = this.selectedAddress();
    return addr ? this.walletService.getTransactionHistory(addr) : [];
  });

  // No constructor needed; using inject() for DI

  searchWallet(): void {
    const addr = this.searchAddress().trim();
    if (addr) {
      this.selectedAddress.set(addr);
    }
  }

  selectAddress(address: string): void {
    this.selectedAddress.set(address);
    this.searchAddress.set(address);
  }

  clearSearch(): void {
    this.selectedAddress.set(null);
    this.searchAddress.set('');
  }
}
