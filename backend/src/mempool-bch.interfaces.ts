import { IEsploraApi } from './api/bitcoin-cash/esplora-api.interface';
import { HeapNode } from "./utils/pairing-heap";

export interface PoolTag {
  id: number; // mysql row id
  name: string;
  link: string;
  regexes: string; // JSON array
  addresses: string; // JSON array
  slug: string;
}

export interface PoolInfo {
  poolId: number; // mysql row id
  name: string;
  link: string;
  blockCount: number;
  slug: string;
}

export interface PoolStats extends PoolInfo {
  rank: number;
  emptyBlocks: number;
}

export interface BlockAudit {
  time: number,
  height: number,
  hash: string,
  missingTxs: string[],
  addedTxs: string[],
  matchRate: number,
}

export interface AuditScore {
  hash: string,
  matchRate?: number,
}

export interface MempoolBlock {
  blockSize: number;
  nTx: number;
  medianFee: number;
  totalFees: number;
  feeRange: number[];
}

export interface MempoolBlockWithTransactions extends MempoolBlock {
  transactionIds: string[];
  transactions: TransactionStripped[];
}

export interface MempoolBlockDelta {
  added: TransactionStripped[];
  removed: string[];
}

interface VinStrippedToScriptsig {
  scriptsig: string;
}

interface VoutStrippedToScriptPubkey {
  scriptpubkey_address: string | undefined;
  value: number;
}

export interface TransactionExtended extends IEsploraApi.Transaction {
  feePerSize: number;
  firstSeen?: number;
  effectiveFeePerSize: number;
  ancestors?: Ancestor[];
  bestDescendant?: BestDescendant | null;
  cpfpChecked?: boolean;
  deleteAfter?: number;
}

export interface AuditTransaction {
  txid: string;
  fee: number;
  size: number;
  feePerSize: number;
  vin: IEsploraApi.Vin[];
  relativesSet: boolean;
  ancestorMap: Map<string, AuditTransaction>;
  children: Set<AuditTransaction>;
  ancestorFee: number;
  ancestorSize: number,
  score: number;
  used: boolean;
  modified: boolean;
  modifiedNode: HeapNode<AuditTransaction>;
}

export interface Ancestor {
  txid: string;
  size: number;
  fee: number;
}

export interface TransactionSet {
  fee: number;
  size: number;
  score: number;
  children?: Set<string>;
  available?: boolean;
  modified?: boolean;
  modifiedNode?: HeapNode<string>;
}

interface BestDescendant {
  txid: string;
  size: number;
  fee: number;
}

export interface CpfpInfo {
  ancestors: Ancestor[];
  bestDescendant: BestDescendant | null;
}

export interface TransactionStripped {
  txid: string;
  fee: number;
  size: number;
  value: number;
}

export interface BlockExtension {
  totalFees?: number;
  medianFee?: number;
  feeRange?: number[];
  reward?: number;
  coinbaseTx?: TransactionMinerInfo;
  matchRate?: number;
  pool?: {
    id: number;
    name: string;
    slug: string;
  };
  avgFee?: number;
  avgFeeRate?: number;
  coinbaseRaw?: string;
  usd?: number | null;
}

export interface BlockExtended extends IEsploraApi.Block {
  extras: BlockExtension;
}

export interface BlockSummary {
  id: string;
  transactions: TransactionStripped[];
}

export interface BlockPrice {
  height: number;
  priceId: number;
}

export interface TransactionMinerInfo {
  vin: VinStrippedToScriptsig[];
  vout: VoutStrippedToScriptPubkey[];
}

export interface MempoolStats {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
}

export interface Statistic {
  id?: number;
  added: string;
  unconfirmed_transactions: number;
  tx_per_second: number;
  bytes_per_second: number;
  total_fee: number;
  mempool_byte_weight: number;
  fee_data: string;

  size_1: number;
  size_2: number;
  size_3: number;
  size_4: number;
  size_5: number;
  size_6: number;
  size_8: number;
  size_10: number;
  size_12: number;
  size_15: number;
  size_20: number;
  size_30: number;
  size_40: number;
  size_50: number;
  size_60: number;
  size_70: number;
  size_80: number;
  size_90: number;
  size_100: number;
  size_125: number;
  size_150: number;
  size_175: number;
  size_200: number;
  size_250: number;
  size_300: number;
  size_350: number;
  size_400: number;
  size_500: number;
  size_600: number;
  size_700: number;
  size_800: number;
  size_900: number;
  size_1000: number;
  size_1200: number;
  size_1400: number;
  size_1600: number;
  size_1800: number;
  size_2000: number;
}

export interface OptimizedStatistic {
  added: string;
  bytes_per_second: number;
  total_fee: number;
  mempool_byte_weight: number;
  sizes: number[];
}

export interface WebsocketResponse {
  action: string;
  data: string[];
  'track-tx': string;
  'track-address': string;
  'watch-mempool': boolean;
  'track-bisq-market': string;
}

export interface BytesPerSecond {
  unixTime: number;
  size: number;
}

export interface RequiredSpec { [name: string]: RequiredParams; }

interface RequiredParams {
  required: boolean;
  types: ('@string' | '@number' | '@boolean' | string)[];
}

export interface ILoadingIndicators { [name: string]: number; }
export interface IConversionRates { [currency: string]: number; }

export interface IBackendInfo {
  hostname: string;
  gitCommit: string;
  version: string;
}

export interface IDifficultyAdjustment {
  progressPercent: number;
  difficultyChange: number;
  estimatedRetargetDate: number;
  remainingBlocks: number;
  remainingTime: number;
  previousRetarget: number;
  nextRetargetHeight: number;
  timeAvg: number;
  timeOffset: number;
}

export interface IndexedDifficultyAdjustment {
  time: number; // UNIX timestamp
  height: number; // Block height
  difficulty: number;
  adjustment: number;
}

export interface RewardStats {
  totalReward: number;
  totalFee: number;
  totalTx: number;
}

export interface ITopNodesPerChannels {
  publicKey: string,
  alias: string,
  channels?: number,
  capacity: number,
  firstSeen?: number,
  updatedAt?: number,
  city?: any,
  country?: any,
}

export interface ITopNodesPerCapacity {
  publicKey: string,
  alias: string,
  capacity: number,
  channels?: number,
  firstSeen?: number,
  updatedAt?: number,
  city?: any,
  country?: any,
}

export interface INodesRanking {
  topByCapacity: ITopNodesPerCapacity[];
  topByChannels: ITopNodesPerChannels[];
}

export interface IOldestNodes {
  publicKey: string,
  alias: string,
  firstSeen: number,
  channels?: number,
  capacity: number,
  updatedAt?: number,
  city?: any,
  country?: any,
}