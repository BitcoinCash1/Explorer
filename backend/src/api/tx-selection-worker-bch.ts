import config from '../config';
import logger from '../logger';
import { TransactionExtended, MempoolBlockWithTransactions, AuditTransaction } from '../mempool-bch.interfaces';
import { PairingHeap } from '../utils/pairing-heap';
import { Common } from './common-bch';
import { parentPort } from 'worker_threads';

if (parentPort) {
  parentPort.on('message', (params: { mempool: { [txid: string]: TransactionExtended }, blockLimit: number, weightLimit: number | null, condenseRest: boolean}) => {
    const { mempool, blocks } = makeBlockTemplates(params);

    // return the result to main thread.
    if (parentPort) {
     parentPort.postMessage({ mempool, blocks });
    }
  });
}

/*
* Build projected mempool blocks using an approximation of the transaction selection algorithm from Bitcoin Core
* (see BlockAssembler in https://github.com/bitcoin/bitcoin/blob/master/src/node/miner.cpp)
*
* blockLimit: number of blocks to build in total.
* blockSizeLimit: maximum block size of transactions to consider using the selection algorithm.
* condenseRest: whether to ignore excess transactions or append them to the final block.
*/
function makeBlockTemplates({ mempool, blockLimit, blockSizeLimit, condenseRest }: { mempool: { [txid: string]: TransactionExtended }, blockLimit: number, blockSizeLimit?: number | null, condenseRest?: boolean | null })
  : { mempool: { [txid: string]: TransactionExtended }, blocks: MempoolBlockWithTransactions[] } {
  const start = Date.now();
  const auditPool: { [txid: string]: AuditTransaction } = {};
  const mempoolArray: AuditTransaction[] = [];
  const restOfArray: TransactionExtended[] = [];
  
  // Maybe implement a maxblock size limit (BTC mempool has here a max weight limit)?
  // const maxBlockSize = blockSizeLimit ? Math.max(... * blockLimit, blockSizeLimit): Infinity;
  // grab the top feerate txs up to maxWeight
  Object.values(mempool).sort((a, b) => b.feePerSize - a.feePerSize).forEach(tx => {
    // size += tx.size;
    // if (size >= maxBlockSize) {
    //   restOfArray.push(tx);
    //   return;
    // }

    // initializing everything up front helps V8 optimize property access later
    auditPool[tx.txid] = {
      txid: tx.txid,
      fee: tx.fee,
      size: tx.size,
      feePerSize: tx.feePerSize,
      vin: tx.vin,
      relativesSet: false,
      ancestorMap: new Map<string, AuditTransaction>(),
      children: new Set<AuditTransaction>(),
      ancestorFee: 0,
      ancestorSize: 0,
      score: 0,
      used: false,
      modified: false,
      modifiedNode: null,
    };
    mempoolArray.push(auditPool[tx.txid]);
  });

  // Build relatives graph & calculate ancestor scores
  for (const tx of mempoolArray) {
    if (!tx.relativesSet) {
      setRelatives(tx, auditPool);
    }
  }

  // Sort by descending ancestor score
  mempoolArray.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Build blocks by greedily choosing the highest feerate package
  // (i.e. the package rooted in the transaction with the best ancestor score)
  const blocks: MempoolBlockWithTransactions[] = [];
  let blockSize = 0;
  let transactions: AuditTransaction[] = [];
  const modified: PairingHeap<AuditTransaction> = new PairingHeap((a, b): boolean => (a.score || 0) > (b.score || 0));
  let overflow: AuditTransaction[] = [];
  let failures = 0;
  let top = 0;
  while ((top < mempoolArray.length || !modified.isEmpty()) && (condenseRest || blocks.length < blockLimit)) {
    // skip invalid transactions
    while (top < mempoolArray.length && (mempoolArray[top].used || mempoolArray[top].modified)) {
      top++;
    }

    // Select best next package
    let nextTx;
    const nextPoolTx = mempoolArray[top];
    const nextModifiedTx = modified.peek();
    if (nextPoolTx && (!nextModifiedTx || (nextPoolTx.score || 0) > (nextModifiedTx.score || 0))) {
      nextTx = nextPoolTx;
      top++;
    } else {
      modified.pop();
      if (nextModifiedTx) {
        nextTx = nextModifiedTx;
        nextTx.modifiedNode = undefined;
      }
    }

    if (nextTx && !nextTx?.used) {
      // Check if the package fits into this block
      // TODO: Check if block size value is also in bytes thus correctly compares to BLOCK_LIMIT_SIZE_BYTES
      if (blockSize < config.MEMPOOL.BLOCK_LIMIT_SIZE_BYTES) {
        const ancestors: AuditTransaction[] = Array.from(nextTx.ancestorMap.values());
        // sort ancestors by dependency graph (equivalent to sorting by ascending ancestor count)
        const sortedTxSet = [...ancestors.sort((a, b) => { return (a.ancestorMap.size || 0) - (b.ancestorMap.size || 0); }), nextTx];
        const effectiveFeeRate = nextTx.ancestorFee;
        sortedTxSet.forEach((ancestor, i, arr) => {
          const mempoolTx = mempool[ancestor.txid];
          if (ancestor && !ancestor?.used) {
            ancestor.used = true;
            // update original copy of this tx with effective fee rate & relatives data
            mempoolTx.effectiveFeePerSize = effectiveFeeRate;
            mempoolTx.ancestors = (Array.from(ancestor.ancestorMap?.values()) as AuditTransaction[]).map((a) => {
              return {
                txid: a.txid,
                fee: a.fee,
                size: a.size,
              };
            });
            mempoolTx.cpfpChecked = true;
            if (i < arr.length - 1) {
              mempoolTx.bestDescendant = {
                txid: arr[arr.length - 1].txid,
                fee: arr[arr.length - 1].fee,
                size: arr[arr.length - 1].size,
              };
            } else {
              mempoolTx.bestDescendant = null;
            }
            transactions.push(ancestor);
            blockSize += ancestor.size;
          }
        });

        // remove these as valid package ancestors for any descendants remaining in the mempool
        if (sortedTxSet.length) {
          sortedTxSet.forEach(tx => {
            updateDescendants(tx, auditPool, modified);
          });
        }

        failures = 0;
      } else {
        // hold this package in an overflow list while we check for smaller options
        overflow.push(nextTx);
        failures++;
      }
    }

    // this block is full
    // Minus how much? removing the coinbase tx maybe? BTC was doing minus 4000 units.
    // TODO: I now remove 1000 bytes. Don't know yet if this is correct.
    const exceededPackageTries = failures > 1000 && blockSize > (config.MEMPOOL.BLOCK_LIMIT_SIZE_BYTES - 1000);
    const queueEmpty = top >= mempoolArray.length && modified.isEmpty();
    if ((exceededPackageTries || queueEmpty) && (!condenseRest || blocks.length < blockLimit - 1)) {
      // construct this block
      if (transactions.length) {
        blocks.push(dataToMempoolBlocks(transactions.map(t => mempool[t.txid]), blockSize, blocks.length));
      }
      // reset for the next block
      transactions = [];
      blockSize = 0;

      // 'overflow' packages didn't fit in this block, but are valid candidates for the next
      for (const overflowTx of overflow.reverse()) {
        if (overflowTx.modified) {
          overflowTx.modifiedNode = modified.add(overflowTx);
        } else {
          top--;
          mempoolArray[top] = overflowTx;
        }
      }
      overflow = [];
    }
  }
  if (condenseRest) {
    // pack any leftover transactions into the last block
    for (const tx of overflow) {
      if (!tx || tx?.used) {
        continue;
      }
      blockSize += tx.size;
      const mempoolTx = mempool[tx.txid];
      // update original copy of this tx with effective fee rate & relatives data
      mempoolTx.effectiveFeePerSize = tx.score;
      mempoolTx.ancestors = (Array.from(tx.ancestorMap?.values()) as AuditTransaction[]).map((a) => {
        return {
          txid: a.txid,
          fee: a.fee,
          size: a.size,
        };
      });
      mempoolTx.bestDescendant = null;
      mempoolTx.cpfpChecked = true;
      transactions.push(tx);
      tx.used = true;
    }
    const blockTransactions = transactions.map(t => mempool[t.txid]);
    restOfArray.forEach(tx => {
      blockSize += tx.size;
      tx.effectiveFeePerSize = tx.feePerSize;
      tx.cpfpChecked = false;
      tx.ancestors = [];
      tx.bestDescendant = null;
      blockTransactions.push(tx);
    });
    if (blockTransactions.length) {
      blocks.push(dataToMempoolBlocks(blockTransactions, blockSize, blocks.length));
    }
    transactions = [];
  } else if (transactions.length) {
    blocks.push(dataToMempoolBlocks(transactions.map(t => mempool[t.txid]), blockSize, blocks.length));
  }

  const end = Date.now();
  const time = end - start;
  logger.debug('Mempool templates calculated in ' + time / 1000 + ' seconds');

  return {
    mempool,
    blocks
  };
}

// traverse in-mempool ancestors
// recursion unavoidable, but should be limited to depth < 25 by mempool policy
function setRelatives(
  tx: AuditTransaction,
  mempool: { [txid: string]: AuditTransaction },
): void {
  for (const parent of tx.vin) {
    const parentTx = mempool[parent.txid];
    if (parentTx && !tx.ancestorMap?.has(parent.txid)) {
      tx.ancestorMap.set(parent.txid, parentTx);
      parentTx.children.add(tx);
      // visit each node only once
      if (!parentTx.relativesSet) {
        setRelatives(parentTx, mempool);
      }
      parentTx.ancestorMap.forEach((ancestor) => {
        tx.ancestorMap.set(ancestor.txid, ancestor);
      });
    }
  };
  tx.ancestorFee = tx.fee || 0;
  tx.ancestorSize = tx.size || 0;
  tx.ancestorMap.forEach((ancestor) => {
    tx.ancestorFee += ancestor.fee;
    tx.ancestorSize+= ancestor.size;
  });
  tx.score = tx.ancestorFee;
  tx.relativesSet = true;
}

// iterate over remaining descendants, removing the root as a valid ancestor & updating the ancestor score
// avoids recursion to limit call stack depth
function updateDescendants(
  rootTx: AuditTransaction,
  mempool: { [txid: string]: AuditTransaction },
  modified: PairingHeap<AuditTransaction>,
): void {
  const descendantSet: Set<AuditTransaction> = new Set();
  // stack of nodes left to visit
  const descendants: AuditTransaction[] = [];
  let descendantTx;
  let tmpScore;
  rootTx.children.forEach(childTx => {
    if (!descendantSet.has(childTx)) {
      descendants.push(childTx);
      descendantSet.add(childTx);
    }
  });
  while (descendants.length) {
    descendantTx = descendants.pop();
    if (descendantTx && descendantTx.ancestorMap && descendantTx.ancestorMap.has(rootTx.txid)) {
      // remove tx as ancestor
      descendantTx.ancestorMap.delete(rootTx.txid);
      descendantTx.ancestorFee -= rootTx.fee;
      descendantTx.ancestorSize -= rootTx.size;
      tmpScore = descendantTx.score;
      descendantTx.score = descendantTx.ancestorFee;

      if (!descendantTx.modifiedNode) {
        descendantTx.modified = true;
        descendantTx.modifiedNode = modified.add(descendantTx);
      } else {
        // rebalance modified heap if score has changed
        if (descendantTx.score < tmpScore) {
          modified.decreasePriority(descendantTx.modifiedNode);
        } else if (descendantTx.score > tmpScore) {
          modified.increasePriority(descendantTx.modifiedNode);
        }
      }

      // add this node's children to the stack
      descendantTx.children.forEach(childTx => {
        // visit each node only once
        if (!descendantSet.has(childTx)) {
          descendants.push(childTx);
          descendantSet.add(childTx);
        }
      });
    }
  }
}

function dataToMempoolBlocks(transactions: TransactionExtended[],
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