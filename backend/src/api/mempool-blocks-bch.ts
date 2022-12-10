import logger from '../logger';
import { MempoolBlock, TransactionExtended, TransactionStripped, MempoolBlockWithTransactions, MempoolBlockDelta } from '../mempool-bch.interfaces';
import { Common } from './common-bch';
import config from '../config';
import { StaticPool } from 'node-worker-threads-pool';
import path from 'path';

class MempoolBlocks {
  private mempoolBlocks: MempoolBlockWithTransactions[] = [];
  private mempoolBlockDeltas: MempoolBlockDelta[] = [];
  private makeTemplatesPool = new StaticPool({
    size: 1,
    task: path.resolve(__dirname, './tx-selection-worker-bch.js'),
  });

  constructor() {}

  public getMempoolBlocks(): MempoolBlock[] {
    return this.mempoolBlocks.map((block) => {
      return {
        blockSize: block.blockSize,
        nTx: block.nTx,
        totalFees: block.totalFees,
        medianFee: block.medianFee,
        feeRange: block.feeRange,
      };
    });
  }

  public getMempoolBlocksWithTransactions(): MempoolBlockWithTransactions[] {
    return this.mempoolBlocks;
  }

  public getMempoolBlockDeltas(): MempoolBlockDelta[] {
    return this.mempoolBlockDeltas;
  }

  public updateMempoolBlocks(memPool: { [txid: string]: TransactionExtended }): void {
    const latestMempool = memPool;
    const memPoolArray: TransactionExtended[] = [];
    for (const i in latestMempool) {
      if (latestMempool.hasOwnProperty(i)) {
        memPoolArray.push(latestMempool[i]);
      }
    }
    const start = new Date().getTime();

    // Clear bestDescendants & ancestors
    memPoolArray.forEach((tx) => {
      tx.bestDescendant = null;
      tx.ancestors = [];
      tx.cpfpChecked = false;
      if (!tx.effectiveFeePerSize) {
        tx.effectiveFeePerSize = tx.feePerSize;
      }
    });

    // First sort
    memPoolArray.sort((a, b) => b.feePerSize - a.feePerSize);

    // Loop through and traverse all ancestors and sum up all the sizes + fees
    // Pass down size + fee to all unconfirmed children
    let sizes = 0;
    memPoolArray.forEach((tx, i) => {
      sizes += tx.size;
      if (sizes > 4000000 * 8) {
        return;
      }
      Common.setRelativesAndGetCpfpInfo(tx, memPool);
    });

    // Final sort, by effective fee
    memPoolArray.sort((a, b) => b.effectiveFeePerSize - a.effectiveFeePerSize);

    const end = new Date().getTime();
    const time = end - start;
    logger.debug('Mempool blocks calculated in ' + time / 1000 + ' seconds');

    const blocks = this.calculateMempoolBlocks(memPoolArray, this.mempoolBlocks);
    const deltas = this.calculateMempoolDeltas(this.mempoolBlocks, blocks);

    this.mempoolBlocks = blocks;
    this.mempoolBlockDeltas = deltas;
  }

  private calculateMempoolBlocks(transactionsSorted: TransactionExtended[], prevBlocks: MempoolBlockWithTransactions[]): MempoolBlockWithTransactions[] {
    const mempoolBlocks: MempoolBlockWithTransactions[] = [];
    let blockSize = 0;
    let transactions: TransactionExtended[] = [];
    transactionsSorted.forEach((tx) => {
      // TODO: Needs additional peer-review for correct BCH implementation here
      if (blockSize + tx.size <= config.MEMPOOL.BLOCK_LIMIT_SIZE_BYTES
        || mempoolBlocks.length === config.MEMPOOL.MEMPOOL_BLOCKS_AMOUNT - 1) {
        blockSize += tx.size;
        transactions.push(tx);
      } else {
        mempoolBlocks.push(this.dataToMempoolBlocks(transactions, blockSize, mempoolBlocks.length));
        blockSize = tx.size;
        transactions = [tx];
      }
    });
    if (transactions.length) {
      mempoolBlocks.push(this.dataToMempoolBlocks(transactions, blockSize, mempoolBlocks.length));
    }

    return mempoolBlocks;
  }

  private calculateMempoolDeltas(prevBlocks: MempoolBlockWithTransactions[], mempoolBlocks: MempoolBlockWithTransactions[]): MempoolBlockDelta[] {
    const mempoolBlockDeltas: MempoolBlockDelta[] = [];
    for (let i = 0; i < Math.max(mempoolBlocks.length, prevBlocks.length); i++) {
      let added: TransactionStripped[] = [];
      let removed: string[] = [];
      if (mempoolBlocks[i] && !prevBlocks[i]) {
        added = mempoolBlocks[i].transactions;
      } else if (!mempoolBlocks[i] && prevBlocks[i]) {
        removed = prevBlocks[i].transactions.map(tx => tx.txid);
      } else if (mempoolBlocks[i] && prevBlocks[i]) {
        const prevIds = {};
        const newIds = {};
        prevBlocks[i].transactions.forEach(tx => {
          prevIds[tx.txid] = true;
        });
        mempoolBlocks[i].transactions.forEach(tx => {
          newIds[tx.txid] = true;
        });
        prevBlocks[i].transactions.forEach(tx => {
          if (!newIds[tx.txid]) {
            removed.push(tx.txid);
          }
        });
        mempoolBlocks[i].transactions.forEach(tx => {
          if (!prevIds[tx.txid]) {
            added.push(tx);
          }
        });
      }
      mempoolBlockDeltas.push({
        added,
        removed
      });
    }
    return mempoolBlockDeltas;
  }

  public async makeBlockTemplates(newMempool: { [txid: string]: TransactionExtended }, blockLimit: number, weightLimit: number | null = null, condenseRest = false): Promise<void> {
    const { mempool, blocks } = await this.makeTemplatesPool.exec({ mempool: newMempool, blockLimit, weightLimit, condenseRest });
    const deltas = this.calculateMempoolDeltas(this.mempoolBlocks, blocks);

    // copy CPFP info across to main thread's mempool
    Object.keys(newMempool).forEach((txid) => {
      if (newMempool[txid] && mempool[txid]) {
        newMempool[txid].effectiveFeePerSize = mempool[txid].effectiveFeePerSize;
        newMempool[txid].ancestors = mempool[txid].ancestors;
        newMempool[txid].bestDescendant = mempool[txid].bestDescendant;
        newMempool[txid].cpfpChecked = mempool[txid].cpfpChecked;
      }
    });

    this.mempoolBlocks = blocks;
    this.mempoolBlockDeltas = deltas;
  }

  private dataToMempoolBlocks(transactions: TransactionExtended[],
    blockSize: number, blocksIndex: number): MempoolBlockWithTransactions {
    let rangeLength = 4;
    if (blocksIndex === 0) {
      rangeLength = 8;
    }
    if (transactions.length > 4000) {
      rangeLength = 6;
    } else if (transactions.length > 10000) {
      rangeLength = 8;
    }
    return {
      blockSize: blockSize,
      nTx: transactions.length,
      totalFees: transactions.reduce((acc, cur) => acc + cur.fee, 0),
      medianFee: Common.percentile(transactions.map((tx) => tx.effectiveFeePerSize), config.MEMPOOL.RECOMMENDED_FEE_PERCENTILE),
      feeRange: Common.getFeesInRange(transactions, rangeLength),
      transactionIds: transactions.map((tx) => tx.txid),
      transactions: transactions.map((tx) => Common.stripTransaction(tx)),
    };
  }
}

export default new MempoolBlocks();
