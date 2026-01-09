import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Blockchain } from '../../services/blockchain';

@Component({
  selector: 'app-wallet-explorer',
  imports: [CommonModule, FormsModule],
  templateUrl: './wallet-explorer.html',
  styleUrl: './wallet-explorer.css',
})
export class WalletExplorer {
  searchAddress = signal<string>('');
  selectedAddress = signal<string | null>(null);

  allAddresses = computed(() => this.blockchainService.getAllAddresses());

  balance = computed(() => {
    const addr = this.selectedAddress();
    return addr ? this.blockchainService.getBalance(addr) : 0;
  });

  history = computed(() => {
    const addr = this.selectedAddress();
    return addr ? this.blockchainService.getAddressHistory(addr) : [];
  });

  constructor(public blockchainService: Blockchain) {}

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
