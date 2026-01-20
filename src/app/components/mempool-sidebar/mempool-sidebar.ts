import {
  Component,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  inject,
  HostListener,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TransactionCard } from '../transaction-card/transaction-card';
import { Transaction } from '../../models/blockchain.model';
import { Blockchain } from '../../services/blockchain.service';
import { MempoolService } from '../../services/mempool.service';
import { WalletService } from '../../services/wallet.service';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';

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
    return this.mempoolService.generateRandomAddress();
  }

  selectSender(): string {
    if (this.generationMode() === 'realistic') {
      const activeWallets = this.walletService.getActiveWallets();
      return this.mempoolService.selectRealisticSender(activeWallets);
    }
    return this.generateRandomAddress();
  }

  selectReceiver(sender: string): string {
    if (this.generationMode() === 'realistic') {
      const allAddresses = this.walletService.getAllAddresses();
      return this.mempoolService.selectRealisticReceiver(sender, allAddresses);
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
        ? this.mempoolService.generateRealisticTransaction(
            this.walletService.getActiveWallets(),
            this.walletService.getAllAddresses(),
            (addr) => this.walletService.getBalance(addr),
          )
        : this.mempoolService.generateRandomTransaction();

      if (tx) {
        this.mempoolService.addTransaction(tx);
      }
    }, this.autoGenerateInterval());
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
