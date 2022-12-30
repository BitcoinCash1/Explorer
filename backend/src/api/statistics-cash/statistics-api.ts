import DB from '../../database';
import logger from '../../logger';
import { Statistic, OptimizedStatistic } from '../../mempool-bch.interfaces';

class StatisticsApi {
  protected queryTimeout = 120000;

  public async $createZeroedStatistic(): Promise<number | undefined> {
    try {
      const query = `INSERT INTO statistics(
              added,
              unconfirmed_transactions,
              tx_per_second,
              bytes_per_second,
              mempool_byte_weight,
              fee_data,
              total_fee,
              size_1,
              size_2,
              size_3,
              size_4,
              size_5,
              size_6,
              size_8,
              size_10,
              size_12,
              size_15,
              size_20,
              size_30,
              size_40,
              size_50,
              size_60,
              size_70,
              size_80,
              size_90,
              size_100,
              size_125,
              size_150,
              size_175,
              size_200,
              size_250,
              size_300,
              size_350,
              size_400,
              size_500,
              size_600,
              size_700,
              size_800,
              size_900,
              size_1000,
              size_1200,
              size_1400,
              size_1600,
              size_1800,
              size_2000
            )
            VALUES (NOW(), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
               0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`;
      const [result]: any = await DB.query(query);
      return result.insertId;
    } catch (e) {
      logger.err('$create() error' + (e instanceof Error ? e.message : e));
    }
  }

  public async $create(statistics: Statistic): Promise<number | undefined> {
    try {
      const query = `INSERT INTO statistics(
              added,
              unconfirmed_transactions,
              tx_per_second,
              bytes_per_second,
              mempool_byte_weight,
              fee_data,
              total_fee,
              size_1,
              size_2,
              size_3,
              size_4,
              size_5,
              size_6,
              size_8,
              size_10,
              size_12,
              size_15,
              size_20,
              size_30,
              size_40,
              size_50,
              size_60,
              size_70,
              size_80,
              size_90,
              size_100,
              size_125,
              size_150,
              size_175,
              size_200,
              size_250,
              size_300,
              size_350,
              size_400,
              size_500,
              size_600,
              size_700,
              size_800,
              size_900,
              size_1000,
              size_1200,
              size_1400,
              size_1600,
              size_1800,
              size_2000
            )
            VALUES (${statistics.added}, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const params: (string | number)[] = [
        statistics.unconfirmed_transactions,
        statistics.tx_per_second,
        statistics.bytes_per_second,
        statistics.mempool_byte_weight,
        statistics.fee_data,
        statistics.total_fee,
        statistics.size_1,
        statistics.size_2,
        statistics.size_3,
        statistics.size_4,
        statistics.size_5,
        statistics.size_6,
        statistics.size_8,
        statistics.size_10,
        statistics.size_12,
        statistics.size_15,
        statistics.size_20,
        statistics.size_30,
        statistics.size_40,
        statistics.size_50,
        statistics.size_60,
        statistics.size_70,
        statistics.size_80,
        statistics.size_90,
        statistics.size_100,
        statistics.size_125,
        statistics.size_150,
        statistics.size_175,
        statistics.size_200,
        statistics.size_250,
        statistics.size_300,
        statistics.size_350,
        statistics.size_400,
        statistics.size_500,
        statistics.size_600,
        statistics.size_700,
        statistics.size_800,
        statistics.size_900,
        statistics.size_1000,
        statistics.size_1200,
        statistics.size_1400,
        statistics.size_1600,
        statistics.size_1800,
        statistics.size_2000,
      ];
      const [result]: any = await DB.query(query, params);
      return result.insertId;
    } catch (e) {
      logger.err('$create() error' + (e instanceof Error ? e.message : e));
    }
  }

  private getQueryForDaysAvg(div: number, interval: string) {
    return `SELECT
      UNIX_TIMESTAMP(added) as added,
      CAST(avg(bytes_per_second) as DOUBLE) as bytes_per_second,
      CAST(avg(size_1) as DOUBLE) as size_1,
      CAST(avg(size_2) as DOUBLE) as size_2,
      CAST(avg(size_3) as DOUBLE) as size_3,
      CAST(avg(size_4) as DOUBLE) as size_4,
      CAST(avg(size_5) as DOUBLE) as size_5,
      CAST(avg(size_6) as DOUBLE) as size_6,
      CAST(avg(size_8) as DOUBLE) as size_8,
      CAST(avg(size_10) as DOUBLE) as size_10,
      CAST(avg(size_12) as DOUBLE) as size_12,
      CAST(avg(size_15) as DOUBLE) as size_15,
      CAST(avg(size_20) as DOUBLE) as size_20,
      CAST(avg(size_30) as DOUBLE) as size_30,
      CAST(avg(size_40) as DOUBLE) as size_40,
      CAST(avg(size_50) as DOUBLE) as size_50,
      CAST(avg(size_60) as DOUBLE) as size_60,
      CAST(avg(size_70) as DOUBLE) as size_70,
      CAST(avg(size_80) as DOUBLE) as size_80,
      CAST(avg(size_90) as DOUBLE) as size_90,
      CAST(avg(size_100) as DOUBLE) as size_100,
      CAST(avg(size_125) as DOUBLE) as size_125,
      CAST(avg(size_150) as DOUBLE) as size_150,
      CAST(avg(size_175) as DOUBLE) as size_175,
      CAST(avg(size_200) as DOUBLE) as size_200,
      CAST(avg(size_250) as DOUBLE) as size_250,
      CAST(avg(size_300) as DOUBLE) as size_300,
      CAST(avg(size_350) as DOUBLE) as size_350,
      CAST(avg(size_400) as DOUBLE) as size_400,
      CAST(avg(size_500) as DOUBLE) as size_500,
      CAST(avg(size_600) as DOUBLE) as size_600,
      CAST(avg(size_700) as DOUBLE) as size_700,
      CAST(avg(size_800) as DOUBLE) as size_800,
      CAST(avg(size_900) as DOUBLE) as size_900,
      CAST(avg(size_1000) as DOUBLE) as size_1000,
      CAST(avg(size_1200) as DOUBLE) as size_1200,
      CAST(avg(size_1400) as DOUBLE) as size_1400,
      CAST(avg(size_1600) as DOUBLE) as size_1600,
      CAST(avg(size_1800) as DOUBLE) as size_1800,
      CAST(avg(size_2000) as DOUBLE) as size_2000 \
      FROM statistics \
      WHERE added BETWEEN DATE_SUB(NOW(), INTERVAL ${interval}) AND NOW() \
      GROUP BY UNIX_TIMESTAMP(added) DIV ${div} \
      ORDER BY statistics.added DESC;`;
  }

  private getQueryForDays(div: number, interval: string) {
    return `SELECT
      UNIX_TIMESTAMP(added) as added,
      CAST(avg(bytes_per_second) as DOUBLE) as bytes_per_second,
      size_1,
      size_2,
      size_3,
      size_4,
      size_5,
      size_6,
      size_8,
      size_10,
      size_12,
      size_15,
      size_20,
      size_30,
      size_40,
      size_50,
      size_60,
      size_70,
      size_80,
      size_90,
      size_100,
      size_125,
      size_150,
      size_175,
      size_200,
      size_250,
      size_300,
      size_350,
      size_400,
      size_500,
      size_600,
      size_700,
      size_800,
      size_900,
      size_1000,
      size_1200,
      size_1400,
      size_1600,
      size_1800,
      size_2000 \
      FROM statistics \
      WHERE added BETWEEN DATE_SUB(NOW(), INTERVAL ${interval}) AND NOW() \
      GROUP BY UNIX_TIMESTAMP(added) DIV ${div} \
      ORDER BY statistics.added DESC;`;
  }

  public async $get(id: number): Promise<OptimizedStatistic | undefined> {
    try {
      const query = `SELECT *, UNIX_TIMESTAMP(added) as added FROM statistics WHERE id = ?`;
      const [rows] = await DB.query(query, [id]);
      if (rows[0]) {
        return this.mapStatisticToOptimizedStatistic([rows[0]])[0];
      }
    } catch (e) {
      logger.err('$list2H() error' + (e instanceof Error ? e.message : e));
    }
  }

  public async $list2H(): Promise<OptimizedStatistic[]> {
    try {
      const query = `SELECT *, UNIX_TIMESTAMP(added) as added FROM statistics ORDER BY statistics.added DESC LIMIT 120`;
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list2H() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list24H(): Promise<OptimizedStatistic[]> {
    try {
      const query = `SELECT *, UNIX_TIMESTAMP(added) as added FROM statistics ORDER BY statistics.added DESC LIMIT 1440`;
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list24h() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list1W(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDaysAvg(300, '1 WEEK'); // 5m interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list1W() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list1M(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDaysAvg(1800, '1 MONTH'); // 30m interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list1M() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list3M(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDaysAvg(7200, '3 MONTH'); // 2h interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list3M() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list6M(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDaysAvg(10800, '6 MONTH'); // 3h interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list6M() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list1Y(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDays(28800, '1 YEAR'); // 8h interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list1Y() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list2Y(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDays(28800, '2 YEAR'); // 8h interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list2Y() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  public async $list3Y(): Promise<OptimizedStatistic[]> {
    try {
      const query = this.getQueryForDays(43200, '3 YEAR'); // 12h interval
      const [rows] = await DB.query({ sql: query, timeout: this.queryTimeout });
      return this.mapStatisticToOptimizedStatistic(rows as Statistic[]);
    } catch (e) {
      logger.err('$list3Y() error' + (e instanceof Error ? e.message : e));
      return [];
    }
  }

  private mapStatisticToOptimizedStatistic(statistic: Statistic[]): OptimizedStatistic[] {
    return statistic.map((s) => {
      return {
        added: s.added,
        bytes_per_second: s.bytes_per_second,
        mempool_byte_weight: s.mempool_byte_weight,
        total_fee: s.total_fee,
        sizes: [
          s.size_1,
          s.size_2,
          s.size_3,
          s.size_4,
          s.size_5,
          s.size_6,
          s.size_8,
          s.size_10,
          s.size_12,
          s.size_15,
          s.size_20,
          s.size_30,
          s.size_40,
          s.size_50,
          s.size_60,
          s.size_70,
          s.size_80,
          s.size_90,
          s.size_100,
          s.size_125,
          s.size_150,
          s.size_175,
          s.size_200,
          s.size_250,
          s.size_300,
          s.size_350,
          s.size_400,
          s.size_500,
          s.size_600,
          s.size_700,
          s.size_800,
          s.size_900,
          s.size_1000,
          s.size_1200,
          s.size_1400,
          s.size_1600,
          s.size_1800,
          s.size_2000,
        ]
      };
    });
  }
}

export default new StatisticsApi();
