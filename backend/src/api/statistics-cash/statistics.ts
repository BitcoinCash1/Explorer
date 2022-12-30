import memPool from '../mempool-bch';
import logger from '../../logger';
import { TransactionExtended, OptimizedStatistic } from '../../mempool-bch.interfaces';
import { Common } from '../common-bch';
import statisticsApi from './statistics-api';

class Statistics {
  protected intervalTimer: NodeJS.Timer | undefined;
  protected newStatisticsEntryCallback: ((stats: OptimizedStatistic) => void) | undefined;

  public setNewStatisticsEntryCallback(fn: (stats: OptimizedStatistic) => void) {
    this.newStatisticsEntryCallback = fn;
  }

  public startStatistics(): void {
    logger.info('Starting statistics service');

    const now = new Date();
    const nextInterval = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(),
      Math.floor(now.getMinutes() / 1) * 1 + 1, 0, 0);
    const difference = nextInterval.getTime() - now.getTime();

    setTimeout(() => {
      this.runStatistics();
      this.intervalTimer = setInterval(() => {
        this.runStatistics();
      }, 1 * 60 * 1000);
    }, difference);
  }

  private async runStatistics(): Promise<void> {
    if (!memPool.isInSync()) {
      return;
    }
    const currentMempool = memPool.getMempool();
    const txPerSecond = memPool.getTxPerSecond();
    const bytesPerSecond = memPool.getBytesPerSecond();

    logger.debug('Running statistics');

    let memPoolArray: TransactionExtended[] = [];
    for (const i in currentMempool) {
      if (currentMempool.hasOwnProperty(i)) {
        memPoolArray.push(currentMempool[i]);
      }
    }
    // Remove 0 and undefined
    memPoolArray = memPoolArray.filter((tx) => tx.effectiveFeePerSize);

    if (!memPoolArray.length) {
      try {
        const insertIdZeroed = await statisticsApi.$createZeroedStatistic();
        if (this.newStatisticsEntryCallback && insertIdZeroed) {
          const newStats = await statisticsApi.$get(insertIdZeroed);
          if (newStats) {
            this.newStatisticsEntryCallback(newStats);
          }
        }
      } catch (e) {
        logger.err('Unable to insert zeroed statistics. ' + e);
      }
      return;
    }

    memPoolArray.sort((a, b) => a.effectiveFeePerSize - b.effectiveFeePerSize);
    const totalWeight = memPoolArray.map((tx) => tx.size).reduce((acc, curr) => acc + curr) * 4;
    const totalFee = memPoolArray.map((tx) => tx.fee).reduce((acc, curr) => acc + curr);

    const logFees = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200,
      250, 300, 350, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000];

    const weightSizeFees: { [feePerWU: number]: number } = {};
    const lastItem = logFees.length - 1;

    memPoolArray.forEach((transaction) => {
      for (let i = 0; i < logFees.length; i++) {
        if (
          ((i === lastItem || transaction.effectiveFeePerSize < logFees[i + 1]))
        ) {
          if (weightSizeFees[logFees[i]]) {
            weightSizeFees[logFees[i]] += transaction.size;
          } else {
            weightSizeFees[logFees[i]] = transaction.size;
          }
          break;
        }
      }
    });

    try {
      const insertId = await statisticsApi.$create({
        added: 'NOW()',
        unconfirmed_transactions: memPoolArray.length,
        tx_per_second: txPerSecond,
        bytes_per_second: Math.round(bytesPerSecond),
        mempool_byte_weight: totalWeight,
        total_fee: totalFee,
        fee_data: '',
        size_1: weightSizeFees['1'] || 0,
        size_2: weightSizeFees['2'] || 0,
        size_3: weightSizeFees['3'] || 0,
        size_4: weightSizeFees['4'] || 0,
        size_5: weightSizeFees['5'] || 0,
        size_6: weightSizeFees['6'] || 0,
        size_8: weightSizeFees['8'] || 0,
        size_10: weightSizeFees['10'] || 0,
        size_12: weightSizeFees['12'] || 0,
        size_15: weightSizeFees['15'] || 0,
        size_20: weightSizeFees['20'] || 0,
        size_30: weightSizeFees['30'] || 0,
        size_40: weightSizeFees['40'] || 0,
        size_50: weightSizeFees['50'] || 0,
        size_60: weightSizeFees['60'] || 0,
        size_70: weightSizeFees['70'] || 0,
        size_80: weightSizeFees['80'] || 0,
        size_90: weightSizeFees['90'] || 0,
        size_100: weightSizeFees['100'] || 0,
        size_125: weightSizeFees['125'] || 0,
        size_150: weightSizeFees['150'] || 0,
        size_175: weightSizeFees['175'] || 0,
        size_200: weightSizeFees['200'] || 0,
        size_250: weightSizeFees['250'] || 0,
        size_300: weightSizeFees['300'] || 0,
        size_350: weightSizeFees['350'] || 0,
        size_400: weightSizeFees['400'] || 0,
        size_500: weightSizeFees['500'] || 0,
        size_600: weightSizeFees['600'] || 0,
        size_700: weightSizeFees['700'] || 0,
        size_800: weightSizeFees['800'] || 0,
        size_900: weightSizeFees['900'] || 0,
        size_1000: weightSizeFees['1000'] || 0,
        size_1200: weightSizeFees['1200'] || 0,
        size_1400: weightSizeFees['1400'] || 0,
        size_1600: weightSizeFees['1600'] || 0,
        size_1800: weightSizeFees['1800'] || 0,
        size_2000: weightSizeFees['2000'] || 0,
      });

      if (this.newStatisticsEntryCallback && insertId) {
        const newStats = await statisticsApi.$get(insertId);
        if (newStats) {
          this.newStatisticsEntryCallback(newStats);
        }
      }
    } catch (e) {
      logger.err('Unable to insert statistics. ' + e);
    }
  }
}

export default new Statistics();
