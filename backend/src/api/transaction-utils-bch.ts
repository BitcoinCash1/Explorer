import bitcoinApi from './bitcoin-cash/bitcoin-api-factory';
import { TransactionExtended, TransactionMinerInfo } from '../mempool-bch.interfaces';
import { IEsploraApi } from './bitcoin-cash/esplora-api.interface';

class TransactionUtils {
  constructor() { }

  public stripCoinbaseTransaction(tx: TransactionExtended): TransactionMinerInfo {
    return {
      vin: [{
        scriptsig: tx.vin[0].scriptsig || tx.vin[0]['coinbase']
      }],
      vout: tx.vout
        .map((vout) => ({
          scriptpubkey_address: vout.scriptpubkey_address,
          value: vout.value
        }))
        .filter((vout) => vout.value)
    };
  }

  public async $getTransactionExtended(txId: string, addPrevouts = false, lazyPrevouts = false): Promise<TransactionExtended> {
    const transaction: IEsploraApi.Transaction = await bitcoinApi.$getRawTransaction(txId, false, addPrevouts, lazyPrevouts);
    return this.extendTransaction(transaction);
  }

  private extendTransaction(transaction: IEsploraApi.Transaction): TransactionExtended {
    // TODO: Peer reviwe this calc for BCH
    const feePerBytes = Math.max(1, (transaction.fee || 0) / (transaction.size));
    const transactionExtended: TransactionExtended = Object.assign({
      feePerSize: feePerBytes,
      effectiveFeePerSize: feePerBytes,
    }, transaction);
    if (!transaction.status.confirmed) {
      transactionExtended.firstSeen = Math.round((new Date().getTime() / 1000));
    }
    return transactionExtended;
  }

  public hex2ascii(hex: string) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }
}

export default new TransactionUtils();
