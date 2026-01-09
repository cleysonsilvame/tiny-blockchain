export interface Miner {
  id: string;
  address: string;
  name: string;
  color: string;
  hashRate: number; // hashes per batch (mining speed)
  totalBlocksMined: number;
  isActive: boolean;
}

export interface MiningProgress {
  minerId: string;
  nonce: number;
  currentHash: string;
  attempts: number;
}

export interface MiningResult {
  winner: Miner;
  nonce: number;
  hash: string;
  attempts: number;
  timestamp: number;
}
