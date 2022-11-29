import config from '../config';
import bitcoinApi from './bitcoin-cash/bitcoin-api-factory';
import { Common } from './common-bch';
import { TransactionExtended, MempoolBlockWithTransactions, AuditScore } from '../mempool-bch.interfaces';
import blocksRepository from '../repositories-cash/BlocksRepository';
import blocksAuditsRepository from '../repositories-cash/BlocksAuditsRepository';
import blocks from '../api/blocks-bch';

const PROPAGATION_MARGIN = 180; // in seconds, time since a transaction is first seen after which it is assumed to have propagated to all miners

// TODO: We need to fully reevaluate this Audit class to be compatible with how Bitcoin Cash is filling blocks
class Audit {
  auditBlock(transactions: TransactionExtended[], projectedBlocks: MempoolBlockWithTransactions[], mempool: { [txId: string]: TransactionExtended })
   : { censored: string[], added: string[], score: number } {
    if (!projectedBlocks?.[0]?.transactionIds || !mempool) {
      return { censored: [], added: [], score: 0 };
    }

    const matches: string[] = []; // present in both mined block and template
    const added: string[] = []; // present in mined block, not in template
    const fresh: string[] = []; // missing, but firstSeen within PROPAGATION_MARGIN
    const isCensored = {}; // missing, without excuse
    const isDisplaced = {};
    let displacedSize = 0; // This variable is converted from BTC called "displacedWeight"

    const inBlock = {};
    const inTemplate = {};

    const now = Math.round((Date.now() / 1000));
    for (const tx of transactions) {
      inBlock[tx.txid] = tx;
    }
    // coinbase is always expected
    if (transactions[0]) {
      inTemplate[transactions[0].txid] = true;
    }
    // look for transactions that were expected in the template, but missing from the mined block
    for (const txid of projectedBlocks[0].transactionIds) {
      if (!inBlock[txid]) {
        // tx is recent, may have reached the miner too late for inclusion
        if (mempool[txid]?.firstSeen != null && (now - (mempool[txid]?.firstSeen || 0)) <= PROPAGATION_MARGIN) {
          fresh.push(txid);
        } else {
          isCensored[txid] = true;
        }
        displacedSize += mempool[txid].size;
      }
      inTemplate[txid] = true;
    }

    displacedSize += (1000 - transactions[0].size); // Used to be 4000 - size

    // we can expect an honest miner to include 'displaced' transactions in place of recent arrivals and censored txs
    // these displaced transactions should occupy the first N weight units of the next projected block
    let displacedSizeRemaining = displacedSize; // This variable is converted from BTC called "displacedWeightRemaining"
    let index = 0;
    let lastFeeRate = Infinity;
    let failures = 0;
    while (projectedBlocks[1] && index < projectedBlocks[1].transactionIds.length && failures < 500) {
      const txid = projectedBlocks[1].transactionIds[index];
      const fits = (mempool[txid].size - displacedSizeRemaining) < 1000; // used to be < 4000
      const feeMatches = mempool[txid].effectiveFeePerSize >= lastFeeRate;
      if (fits || feeMatches) {
        isDisplaced[txid] = true;
        if (fits) {
          lastFeeRate = Math.min(lastFeeRate, mempool[txid].effectiveFeePerSize);
        }
        if (mempool[txid].firstSeen == null || (now - (mempool[txid]?.firstSeen || 0)) > PROPAGATION_MARGIN) {
          displacedSizeRemaining -= mempool[txid].size;
        }
        failures = 0;
      } else {
        failures++;
      }
      index++;
    }

    // mark unexpected transactions in the mined block as 'added'
    let overflowSize = 0; // This variable is converted from BTC called "overflowWeight"
    let totalSize = 0; // This variable is converted from BTC called "totalWeight"
    for (const tx of transactions) {
      if (inTemplate[tx.txid]) {
        matches.push(tx.txid);
      } else {
        if (!isDisplaced[tx.txid]) {
          added.push(tx.txid);
        }
        overflowSize += tx.size;
      }
      totalSize += tx.size;
    }

    // transactions missing from near the end of our template are probably not being censored
    let overflowSizeRemaining = overflowSize - (config.MEMPOOL.BLOCK_LIMIT_SIZE_BYTES - totalSize); // This variable is converted from BTC called "overflowWeightRemaining"
    let maxOverflowRate = 0;
    let rateThreshold = 0;
    index = projectedBlocks[0].transactionIds.length - 1;
    while (index >= 0) {
      const txid = projectedBlocks[0].transactionIds[index];
      if (overflowSizeRemaining > 0) {
        if (isCensored[txid]) {
          delete isCensored[txid];
        }
        if (mempool[txid].effectiveFeePerSize > maxOverflowRate) {
          maxOverflowRate = mempool[txid].effectiveFeePerSize;
          rateThreshold = (Math.ceil(maxOverflowRate * 100) / 100) + 0.005;
        }
      } else if (mempool[txid].effectiveFeePerSize <= rateThreshold) { // tolerance of 0.01 sat/vb + rounding
        if (isCensored[txid]) {
          delete isCensored[txid];
        }
      }
      overflowSizeRemaining -= (mempool[txid]?.size || 0);
      index--;
    }

    const numCensored = Object.keys(isCensored).length;
    const score = matches.length > 0 ? (matches.length / (matches.length + numCensored)) : 0;

    return {
      censored: Object.keys(isCensored),
      added,
      score
    };
  }

  public async $getBlockAuditScores(fromHeight?: number, limit: number = 15): Promise<AuditScore[]> {
    let currentHeight = fromHeight !== undefined ? fromHeight : await blocksRepository.$mostRecentBlockHeight();
    const returnScores: AuditScore[] = [];

    if (currentHeight < 0) {
      return returnScores;
    }

    for (let i = 0; i < limit && currentHeight >= 0; i++) {
      const block = blocks.getBlocks().find((b) => b.height === currentHeight);
      if (block?.extras?.matchRate != null) {
        returnScores.push({
          hash: block.id,
          matchRate: block.extras.matchRate
        });
      } else {
        let currentHash;
        if (!currentHash && Common.indexingEnabled()) {
          const dbBlock = await blocksRepository.$getBlockByHeight(currentHeight);
          if (dbBlock && dbBlock['id']) {
            currentHash = dbBlock['id'];
          }
        }
        if (!currentHash) {
          currentHash = await bitcoinApi.$getBlockHash(currentHeight);
        }
        if (currentHash) {
          const auditScore = await blocksAuditsRepository.$getBlockAuditScore(currentHash);
          returnScores.push({
            hash: currentHash,
            matchRate: auditScore?.matchRate
          });
        }
      }
      currentHeight--;
    }
    return returnScores;
  }
}

export default new Audit();