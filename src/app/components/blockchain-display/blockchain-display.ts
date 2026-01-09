import { Component, Input, signal, computed, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Block } from '../../models/blockchain.model';
import { Blockchain } from '../../services/blockchain';
import { ForkService } from '../../services/fork.service';
import { ForkTabs } from '../fork-tabs/fork-tabs';

@Component({
  selector: 'app-blockchain-display',
  imports: [FormsModule, ForkTabs],
  templateUrl: './blockchain-display.html',
  styleUrl: './blockchain-display.css',
})
export class BlockchainDisplay {
  blockchainService = inject(Blockchain);
  private forkService = inject(ForkService);

  @Input() blocks: Block[] = [];

  editingBlock = signal<number | null>(null);
  editData = signal<string>('');
  validationResult = signal<{ isValid: boolean; invalidBlocks: number[] } | null>(null);
  showValidation = signal<boolean>(false);

  // Computed blocks from active fork
  displayBlocks = computed(() => {
    const activeForkId = this.forkService.activeForkId();
    const forks = this.forkService.forks();

    if (!activeForkId) return [];

    const activeFork = forks.find((f) => f.id === activeForkId);
    return activeFork ? activeFork.chain : [];
  });

  // No constructor needed; using inject() for DI

  isBlockInvalid(blockNumber: number): boolean {
    return this.blockchainService.isBlockInvalid(blockNumber);
  }

  startEditing(block: Block): void {
    this.editingBlock.set(block.number);
    this.editData.set(block.data);
  }

  cancelEditing(): void {
    this.editingBlock.set(null);
    this.editData.set('');
  }

  saveEdit(blockNumber: number): void {
    this.blockchainService.tamperBlock(blockNumber, this.editData());
    this.editingBlock.set(null);
    this.editData.set('');

    // Automatically revalidate after tampering
    setTimeout(() => {
      this.validateBlockchain();
    }, 100);
  }

  validateBlockchain(): void {
    const result = this.blockchainService.validateChain();
    this.validationResult.set(result);
    this.showValidation.set(true);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.showValidation.set(false);
    }, 5000);
  }
}
