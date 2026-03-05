import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Transaction } from '../../models/blockchain.model';
import { Blockchain } from '../../services/blockchain.service';
import { MempoolService } from '../../services/mempool.service';
import { WalletService } from '../../services/wallet.service';
import { TransactionCard } from '../transaction-card/transaction-card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

@Component({
  selector: 'app-mempool-sidebar',
  imports: [FormsModule, TransactionCard, Popover, PopoverTrigger, PopoverContent],
  templateUrl: './mempool-sidebar.html',
  styleUrl: './mempool-sidebar.css',
})
export class MempoolSidebar implements OnDestroy {
  blockchainService = inject(Blockchain);
  mempoolService = inject(MempoolService);
  walletService = inject(WalletService);

  @ViewChild('newTxPopover') newTxPopover?: Popover;
  @ViewChild('autoPopover') autoPopover?: Popover;

  sender = signal<string>('');
  receiver = signal<string>('');
  amount = signal<string>('');
  fee = signal<string>('0.0001');
  autoGenerate = signal<boolean>(false);
  autoGenerateInterval = signal<number>(5000);
  generationMode = signal<'realistic' | 'random'>('realistic'); // Modo de geração
  private autoGenerateTimer?: number;
  private txCounter = 1;

  transactions = computed(() => this.mempoolService.mempool());
  isPrioritized = computed(() => this.mempoolService.prioritizeMempoolByFee());
  sortedTransactions = computed(() => {
    const txs = this.transactions();
    return this.isPrioritized() ? [...txs].sort((a, b) => b.fee - a.fee) : txs;
  });

  // No constructor or ngOnInit needed; using signals

  ngOnDestroy(): void {
    if (this.autoGenerateTimer) {
      clearInterval(this.autoGenerateTimer);
    }
  }

  closeAllPopovers(): void {
    this.newTxPopover?.close();
    this.autoPopover?.close();
  }

  generateRandomAddress(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const prefixes = ['1', '3', 'bc1q'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let address = prefix;
    const length = prefix === 'bc1q' ? 38 : 30;
    for (let i = prefix.length; i < length; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return address;
  }

  selectSender(): string {
    if (this.generationMode() === 'realistic') {
      const activeWallets = this.walletService.activeWallets();
      if (activeWallets.length === 0) {
        return this.generateRandomAddress();
      }
      if (Math.random() < 0.8) {
        const wallet = activeWallets[Math.floor(Math.random() * activeWallets.length)];
        return wallet.address;
      }
    }
    return this.generateRandomAddress();
  }

  selectReceiver(sender: string): string {
    if (this.generationMode() === 'realistic') {
      const allAddresses = this.walletService.allAddresses();
      const otherAddresses = allAddresses.filter((addr) => addr !== sender);
      if (otherAddresses.length > 0 && Math.random() < 0.6) {
        return otherAddresses[Math.floor(Math.random() * otherAddresses.length)];
      }
    }
    return this.generateRandomAddress();
  }

  fillRandomData(): void {
    const sender = this.selectSender();
    const receiver = this.selectReceiver(sender);
    this.sender.set(sender);
    this.receiver.set(receiver);
    this.amount.set((Math.random() * 5).toFixed(3));
    this.fee.set((Math.random() * 0.001).toFixed(6));
  }

  submitTransaction(event: Event): void {
    event.preventDefault();

    if (!this.sender() || !this.receiver() || !this.amount()) return;

    const newTx: Transaction = {
      id: `manual-${Date.now()}-${this.txCounter}`,
      sender: this.sender().trim(),
      receiver: this.receiver().trim(),
      amount: parseFloat(this.amount()),
      fee: parseFloat(this.fee() || '0'),
    };

    if (!this.mempoolService.canMakeTransaction(newTx, (addr) => this.walletService.getBalance(addr))) {
      alert('Insufficient balance!');
      return;
    }

    this.mempoolService.addTransaction(newTx);
    this.txCounter++;
    this.sender.set('');
    this.receiver.set('');
    this.amount.set('');
    this.fee.set('0.0001');
  }

  toggleAutoGenerate(): void {
    const newValue = !this.autoGenerate();
    this.autoGenerate.set(newValue);

    if (newValue) {
      this.startAutoGeneration();
    } else {
      this.stopAutoGeneration();
    }
  }

  startAutoGeneration(): void {
    this.autoGenerateTimer = setInterval(() => {
      const tx = this.generationMode() === 'realistic'
        ? this.generateRealisticTransaction()
        : this.generateRandomTransaction();

      if (tx) {
        this.mempoolService.addTransaction(tx);
      }
    }, this.autoGenerateInterval());
  }

  generateRealisticTransaction(): Transaction | null {
    const sender = this.selectSender();
    const receiver = this.selectReceiver(sender);
    const amount = parseFloat((Math.random() * 5).toFixed(3));
    const fee = parseFloat((Math.random() * 0.001).toFixed(6));

    const tx: Transaction = {
      id: `auto-${Date.now()}-${Math.random()}`,
      sender,
      receiver,
      amount,
      fee,
    };

    if (!this.mempoolService.canMakeTransaction(tx, (addr) => this.walletService.getBalance(addr))) {
      return null;
    }

    return tx;
  }

  generateRandomTransaction(): Transaction {
    const sender = this.generateRandomAddress();
    const receiver = this.generateRandomAddress();
    const amount = parseFloat((Math.random() * 5).toFixed(3));
    const fee = parseFloat((Math.random() * 0.001).toFixed(6));

    return {
      id: `auto-${Date.now()}-${Math.random()}`,
      sender,
      receiver,
      amount,
      fee,
    };
  }

  stopAutoGeneration(): void {
    if (this.autoGenerateTimer) {
      clearInterval(this.autoGenerateTimer);
      this.autoGenerateTimer = undefined;
    }
  }

  updateAutoInterval(): void {
    if (this.autoGenerate()) {
      this.stopAutoGeneration();
      this.startAutoGeneration();
    }
  }

  toggleGenerationMode(): void {
    this.generationMode.update((mode) => (mode === 'realistic' ? 'random' : 'realistic'));
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllPopovers();
  }
}
