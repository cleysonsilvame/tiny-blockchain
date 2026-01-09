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
import { Blockchain } from '../../services/blockchain';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';

@Component({
  selector: 'app-mempool-sidebar',
  imports: [FormsModule, TransactionCard, Popover, PopoverTrigger, PopoverContent],
  templateUrl: './mempool-sidebar.html',
  styleUrl: './mempool-sidebar.css',
})
export class MempoolSidebar implements OnDestroy {
  blockchainService = inject(Blockchain);

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

  transactions = computed(() => this.blockchainService.mempool());
  isPrioritized = computed(() => this.blockchainService.prioritizeMempoolByFee());
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

  // Seleciona um remetente realista (com saldo positivo) ou aleatório
  selectSender(): string {
    if (this.generationMode() === 'realistic') {
      const activeWallets = this.blockchainService.getActiveWallets();
      
      // Se não houver carteiras ativas, usa aleatório
      if (activeWallets.length === 0) {
        return this.generateRandomAddress();
      }

      // 80% chance de usar carteira ativa, 20% chance de novo endereço
      if (Math.random() < 0.8) {
        const wallet = activeWallets[Math.floor(Math.random() * activeWallets.length)];
        return wallet.address;
      }
    }
    
    return this.generateRandomAddress();
  }

  // Seleciona um destinatário (prefere carteiras diferentes do sender)
  selectReceiver(sender: string): string {
    if (this.generationMode() === 'realistic') {
      const allAddresses = this.blockchainService.getAllAddresses();
      const otherAddresses = allAddresses.filter((addr) => addr !== sender);
      
      // Se há outros endereços na blockchain, prefere um deles
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

    this.blockchainService.addTransaction(newTx);
    this.txCounter++;
    this.sender.set('');
    this.receiver.set('');
    this.amount.set('');
    this.fee.set('0.0001');
    this.newTxPopover?.close();
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
      const sender = this.selectSender();
      const receiver = this.selectReceiver(sender);
      const amount = parseFloat((Math.random() * 5).toFixed(3));
      const fee = parseFloat((Math.random() * 0.001).toFixed(6));

      const newTx: Transaction = {
        id: `auto-${Date.now()}-${Math.random()}`,
        sender,
        receiver,
        amount,
        fee,
      };

      // Em modo realista, valida se o sender tem fundos
      if (this.generationMode() === 'realistic') {
        if (!this.blockchainService.canMakeTransaction(newTx)) {
          return; // Ignora transação se não tiver fundos
        }
      }

      this.blockchainService.addTransaction(newTx);
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
