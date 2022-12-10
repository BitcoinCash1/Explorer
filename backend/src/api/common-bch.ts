import { CpfpInfo, TransactionExtended, TransactionStripped } from '../mempool-bch.interfaces';
import config from '../config';
import { isIP } from 'net';
export class Common {
  static nativeAssetId = config.MEMPOOL.NETWORK === 'liquidtestnet' ?
    '144c654344aa716d6f3abcc1ca90e5641e4e2a7f633bc09fe3baf64585819a49'
  : '6f0279e9ed041c3d710a9f57d0c02928416460c4b722ae3457a11eec381c526d';

  static median(numbers: number[]) {
    let medianNr = 0;
    const numsLen = numbers.length;
    if (numsLen % 2 === 0) {
        medianNr = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
    } else {
        medianNr = numbers[(numsLen - 1) / 2];
    }
    return medianNr;
  }

  static percentile(numbers: number[], percentile: number) {
    if (percentile === 50) {
      return this.median(numbers);
    }
    const index = Math.ceil(numbers.length * (100 - percentile) * 1e-2);
    if (index < 0 || index > numbers.length - 1) {
      return 0;
    }
    return numbers[index];
  }

  // TODO: Peer review this function for BCH
  static getFeesInRange(transactions: TransactionExtended[], rangeLength: number) {
    const arr = [transactions[transactions.length - 1].effectiveFeePerSize];
    const chunk = 1 / (rangeLength - 1);
    let itemsToAdd = rangeLength - 2;

    while (itemsToAdd > 0) {
      arr.push(transactions[Math.floor(transactions.length * chunk * itemsToAdd)].effectiveFeePerSize);
      itemsToAdd--;
    }

    arr.push(transactions[0].effectiveFeePerSize);
    return arr;
  }

  static stripTransaction(tx: TransactionExtended): TransactionStripped {
    return {
      txid: tx.txid,
      fee: tx.fee,
      size: tx.size,
      value: tx.vout.reduce((acc, vout) => acc + (vout.value ? vout.value : 0), 0),
    };
  }

  static sleep$(ms: number): Promise<void> {
    return new Promise((resolve) => {
       setTimeout(() => {
         resolve();
       }, ms);
    });
  }

  static shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // TODO: Peer review this function for BCH
  // Check if I made the correct totalSize, effectiveFeePerVsize, ... assumptions and calculations
  static setRelativesAndGetCpfpInfo(tx: TransactionExtended, memPool: { [txid: string]: TransactionExtended }): CpfpInfo {
    const parents = this.findAllParents(tx, memPool);
    const lowerFeeParents = parents.filter((parent) => parent.feePerSize < tx.effectiveFeePerSize);

    let totalSize = tx.size + lowerFeeParents.reduce((prev, val) => prev + val.size, 0);
    let totalFees = tx.fee + lowerFeeParents.reduce((prev, val) => prev + val.fee, 0);

    tx.ancestors = parents
      .map((t) => {
        return {
          txid: t.txid,
          size: t.size,
          fee: t.fee,
        };
      });

    // Add high (high fee) decendant weight and fees
    if (tx.bestDescendant) {
      totalSize += tx.bestDescendant.size;
      totalFees += tx.bestDescendant.fee;
    }

    tx.effectiveFeePerSize = Math.max(0, totalFees / (totalSize));
    tx.cpfpChecked = true;

    return {
      ancestors: tx.ancestors,
      bestDescendant: tx.bestDescendant || null,
    };
  }

  // TODO: Peer review this function for BCH
  private static findAllParents(tx: TransactionExtended, memPool: { [txid: string]: TransactionExtended }): TransactionExtended[] {
    let parents: TransactionExtended[] = [];
    tx.vin.forEach((parent) => {
      if (parents.find((p) => p.txid === parent.txid)) {
        return;
      }

      const parentTx = memPool[parent.txid];
      if (parentTx) {
        if (tx.bestDescendant && tx.bestDescendant.fee / (tx.bestDescendant.size) > parentTx.feePerSize) {
          if (parentTx.bestDescendant && parentTx.bestDescendant.fee < tx.fee + tx.bestDescendant.fee) {
            parentTx.bestDescendant = {
              size: tx.size + tx.bestDescendant.size,
              fee: tx.fee + tx.bestDescendant.fee,
              txid: tx.txid,
            };
          }
        } else if (tx.feePerSize > parentTx.feePerSize) {
          parentTx.bestDescendant = {
            size: tx.size,
            fee: tx.fee,
            txid: tx.txid
          };
        }
        parents.push(parentTx);
        parents = parents.concat(this.findAllParents(parentTx, memPool));
      }
    });
    return parents;
  }

  static getSqlInterval(interval: string | null): string | null {
    switch (interval) {
      case '24h': return '1 DAY';
      case '3d': return '3 DAY';
      case '1w': return '1 WEEK';
      case '1m': return '1 MONTH';
      case '3m': return '3 MONTH';
      case '6m': return '6 MONTH';
      case '1y': return '1 YEAR';
      case '2y': return '2 YEAR';
      case '3y': return '3 YEAR';
      default: return null;
    }
  }

  static indexingEnabled(): boolean {
    return (
      ['mainnet', 'testnet', 'signet'].includes(config.MEMPOOL.NETWORK) &&
      config.DATABASE.ENABLED === true &&
      config.MEMPOOL.INDEXING_BLOCKS_AMOUNT !== 0
    );
  }

  static blocksSummariesIndexingEnabled(): boolean {
    return (
      Common.indexingEnabled() &&
      config.MEMPOOL.BLOCKS_SUMMARIES_INDEXING === true
    );
  }

  static setDateMidnight(date: Date): void {
    date.setUTCHours(0);
    date.setUTCMinutes(0);
    date.setUTCSeconds(0);
    date.setUTCMilliseconds(0);
  }

  static channelShortIdToIntegerId(channelId: string): string {
    if (channelId.indexOf('x') === -1) { // Already an integer id
      return channelId;
    }
    if (channelId.indexOf('/') !== -1) { // Topology import
      channelId = channelId.slice(0, -2);
    }
    const s = channelId.split('x').map(part => BigInt(part));
    return ((s[0] << 40n) | (s[1] << 16n) | s[2]).toString();
  }

  /** Decodes a channel id returned by lnd as uint64 to a short channel id */
  static channelIntegerIdToShortId(id: string): string {
    if (id.indexOf('/') !== -1) {
      id = id.slice(0, -2);
    }
    
    if (id.indexOf('x') !== -1) { // Already a short id
      return id;
    }

    const n = BigInt(id);
    return [
      n >> 40n, // nth block
      (n >> 16n) & 0xffffffn, // nth tx of the block
      n & 0xffffn // nth output of the tx
    ].join('x');
  }

  static utcDateToMysql(date?: number): string {
    const d = new Date((date || 0) * 1000);
    return d.toISOString().split('T')[0] + ' ' + d.toTimeString().split(' ')[0];
  }

  static findSocketNetwork(addr: string): {network: string | null, url: string} {
    let network: string | null = null;
    let url = addr.split('://')[1];

    if (!url) {
      return {
        network: null,
        url: addr,
      };
    }

    if (addr.indexOf('onion') !== -1) {
      if (url.split('.')[0].length >= 56) {
        network = 'torv3';
      } else {
        network = 'torv2';
      }
    } else if (addr.indexOf('i2p') !== -1) {
      network = 'i2p';
    } else if (addr.indexOf('ipv4') !== -1) {
      const ipv = isIP(url.split(':')[0]);
      if (ipv === 4) {
        network = 'ipv4';
      } else {
        return {
          network: null,
          url: addr,
        };
      }
    } else if (addr.indexOf('ipv6') !== -1) {
      url = url.split('[')[1].split(']')[0];
      const ipv = isIP(url);
      if (ipv === 6) {
        const parts = addr.split(':');
        network = 'ipv6';
        url = `[${url}]:${parts[parts.length - 1]}`;
      } else {
        return {
          network: null,
          url: addr,
        };
      }
    } else {
      return {
        network: null,
        url: addr,
      };
    }

    return {
      network: network,
      url: url,
    };
  }
}
