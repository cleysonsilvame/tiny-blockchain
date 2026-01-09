import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-transaction-card',
  imports: [],
  templateUrl: './transaction-card.html',
  styleUrl: './transaction-card.css',
})
export class TransactionCard {
  @Input() sender!: string;
  @Input() receiver!: string;
  @Input() amount!: number;
  @Input() fee = 0;
  @Input() prioritized = false;
}
