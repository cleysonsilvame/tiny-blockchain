import { Block } from './blockchain.model';

export interface BlockchainFork {
  id: string;
  name: string;
  chain: Block[];
  color: string;
  isMainChain: boolean;
  forkPoint: number; // Block number where fork started
}
