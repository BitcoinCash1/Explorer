import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlockPredictionGraphComponentBch } from '../components/block-prediction-graph-bch/block-prediction-graph.component';
import { BlockFeeRatesGraphComponentBch } from '../components/block-fee-rates-graph-bch/block-fee-rates-graph.component';
import { BlockFeesGraphComponentBch } from '../components/block-fees-graph-bch/block-fees-graph.component';
import { BlockRewardsGraphComponentBch } from '../components/block-rewards-graph-bch/block-rewards-graph.component';
import { BlockSizesGraphComponentBch } from '../components/block-sizes-graph-bch/block-sizes-graph.component';
import { GraphsComponentBch } from '../components/graphs-bch/graphs.component';
import { HashrateChartComponentBch } from '../components/hashrate-chart-bch/hashrate-chart.component';
import { HashrateChartPoolsComponentBch } from '../components/hashrates-chart-pools-bch/hashrate-chart-pools.component';
import { MasterPageComponentBch } from '../components/master-page-bch/master-page.component';
import { MempoolBlockComponentBch } from '../components/mempool-block-bch/mempool-block.component';
import { MiningDashboardComponentBch } from '../components/mining-dashboard-bch/mining-dashboard.component';
import { PoolRankingComponentBch } from '../components/pool-ranking-bch/pool-ranking.component';
import { PoolComponentBch } from '../components/pool-bch/pool.component';
import { StartComponentBch } from '../components/start-bch/start.component';
import { StatisticsComponentBch } from '../components/statistics-bch/statistics.component';
import { TelevisionComponentBch } from '../components/television-bch/television.component';
import { DashboardComponentBch } from '../dashboard-bch/dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: MasterPageComponentBch,
    children: [
      {
        path: 'mining/pool/:slug',
        data: { networks: ['bitcoin'] },
        component: PoolComponentBch,
      },
      {
        path: 'mining',
        data: { networks: ['bitcoin'] },
        component: StartComponentBch,
        children: [
          {
            path: '',
            component: MiningDashboardComponentBch,
          },
        ]
      },
      {
        path: 'mempool-block/:id',
        data: { networks: ['bitcoin', 'liquid'] },
        component: StartComponentBch,
        children: [
          {
            path: '',
            component: MempoolBlockComponentBch,
          },
        ]
      },
      {
        path: 'graphs',
        data: { networks: ['bitcoin', 'liquid'] },
        component: GraphsComponentBch,
        children: [
          {
            path: 'mempool',
            data: { networks: ['bitcoin', 'liquid'] },
            component: StatisticsComponentBch,
          },
          {
            path: 'mining/hashrate-difficulty',
            data: { networks: ['bitcoin'] },
            component: HashrateChartComponentBch,
          },
          {
            path: 'mining/pools-dominance',
            data: { networks: ['bitcoin'] },
            component: HashrateChartPoolsComponentBch,
          },
          {
            path: 'mining/pools',
            data: { networks: ['bitcoin'] },
            component: PoolRankingComponentBch,
          },
          {
            path: 'mining/block-fees',
            data: { networks: ['bitcoin'] },
            component: BlockFeesGraphComponentBch,
          },
          {
            path: 'mining/block-rewards',
            data: { networks: ['bitcoin'] },
            component: BlockRewardsGraphComponentBch,
          },
          {
            path: 'mining/block-fee-rates',
            data: { networks: ['bitcoin'] },
            component: BlockFeeRatesGraphComponentBch,
          },
          {
            path: 'mining/block-sizes',
            data: { networks: ['bitcoin'] },
            component: BlockSizesGraphComponentBch,
          },
          {
            path: '',
            redirectTo: 'mempool',
          },
          {
            path: 'mining/block-prediction',
            data: { networks: ['bitcoin'] },
            component: BlockPredictionGraphComponentBch,
          },
        ]
      },
      {
        path: '',
        component: StartComponentBch,
        children: [{
          path: '',
          component: DashboardComponentBch,
        }]
      },
    ]
  },
  {
    path: 'tv',
    data: { networks: ['bitcoin', 'liquid'] },
    component: TelevisionComponentBch
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class GraphsRoutingModule { }
