import { NgModule } from '@angular/core';
import { NgxEchartsModule } from 'ngx-echarts';
import { GraphsRoutingModule } from './graphs.routing.module';
import { SharedModule } from '../shared/shared.module';

import { BlockFeesGraphComponentBch } from '../components/block-fees-graph-bch/block-fees-graph.component';
import { BlockRewardsGraphComponentBch } from '../components/block-rewards-graph-bch/block-rewards-graph.component';
import { BlockFeeRatesGraphComponentBch } from '../components/block-fee-rates-graph-bch/block-fee-rates-graph.component';
import { BlockSizesGraphComponentBch } from '../components/block-sizes-graph-bch/block-sizes-graph.component';
import { FeeDistributionGraphComponentBch } from '../components/fee-distribution-graph-bch/fee-distribution-graph.component';
import { IncomingTransactionsGraphComponentBch } from '../components/incoming-transactions-graph-bch/incoming-transactions-graph.component';
import { MempoolGraphComponentBch } from '../components/mempool-graph-bch/mempool-graph.component';
import { GraphsComponentBch } from '../components/graphs-bch/graphs.component';
import { StatisticsComponentBch } from '../components/statistics-bch/statistics.component';
import { MempoolBlockComponentBch } from '../components/mempool-block-bch/mempool-block.component';
import { MempoolBlockOverviewComponentBch } from '../components/mempool-block-overview-bch/mempool-block-overview.component';
import { PoolRankingComponentBch } from '../components/pool-ranking-bch/pool-ranking.component';
import { PoolComponentBch } from '../components/pool-bch/pool.component';
import { TelevisionComponentBch } from '../components/television-bch/television.component';
import { DashboardComponentBch } from '../dashboard-bch/dashboard.component';
import { MiningDashboardComponentBch } from '../components/mining-dashboard-bch/mining-dashboard.component';
import { HashrateChartComponentBch } from '../components/hashrate-chart-bch/hashrate-chart.component';
import { HashrateChartPoolsComponentBch } from '../components/hashrates-chart-pools-bch/hashrate-chart-pools.component';
import { BlockPredictionGraphComponentBch } from '../components/block-prediction-graph-bch/block-prediction-graph.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [
    DashboardComponentBch,
    MempoolBlockComponentBch,

    MiningDashboardComponentBch,
    PoolComponentBch,
    PoolRankingComponentBch,
    TelevisionComponentBch,

    StatisticsComponentBch,
    GraphsComponentBch,
    BlockFeesGraphComponentBch,
    BlockRewardsGraphComponentBch,
    BlockFeeRatesGraphComponentBch,
    BlockSizesGraphComponentBch,
    FeeDistributionGraphComponentBch,
    MempoolBlockOverviewComponentBch,
    IncomingTransactionsGraphComponentBch,
    MempoolGraphComponentBch,
    HashrateChartComponentBch,
    HashrateChartPoolsComponentBch,
    BlockPredictionGraphComponentBch,
  ],
  imports: [
    CommonModule,
    SharedModule,
    GraphsRoutingModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    })
  ],
  exports: [
    NgxEchartsModule,
  ]
})
export class GraphsModule { }
