import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-transaction-card',
  imports: [CommonModule],
  templateUrl: './transaction-card.html',
  styleUrl: './transaction-card.css'
})
export class TransactionCard {
  @Input() sender!: string;
  @Input() receiver!: string;
  @Input() amount!: number;
  @Input() fee: number = 0;
  @Input() prioritized: boolean = false;
}

