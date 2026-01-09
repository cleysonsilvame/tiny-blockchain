export interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
  fee: number; // Taxa de transação em BTC
}

export interface Block {
  number: number;
  nonce: number;
  data: string;
  previousHash: string;
  hash: string;
  transactions: Transaction[];
  minerAddress: string; // Endereço do minerador
  reward: number; // Recompensa total (base + taxas)
  timestamp: number; // Timestamp do bloco
}
