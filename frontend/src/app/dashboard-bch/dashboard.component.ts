import { ChangeDetectionStrategy, Component, Inject, LOCALE_ID, OnInit } from '@angular/core';
import { combineLatest, merge, Observable, of } from 'rxjs';
import { filter, map, scan, share, switchMap, tap } from 'rxjs/operators';
import { BlockExtended, OptimizedMempoolStats } from '../interfaces-bch/node-api.interface';
import { MempoolInfo, TransactionStripped } from '../interfaces-bch/websocket.interface';
import { ApiService } from '../services/api-bch.service';
import { StateService } from '../services/state-bch.service';
import { WebsocketService } from '../services/websocket-bch.service';
import { SeoService } from '../services/seo-bch.service';
import { StorageService } from '../services/storage.service';

interface MempoolBlocksData {
  blocks: number;
  size: number;
}

interface MempoolInfoData {
  memPoolInfo: MempoolInfo;
  bytesPerSecond: number;
  progressWidth: string;
  progressColor: string;
}

interface MempoolStatsData {
  mempool: OptimizedMempoolStats[];
  weightPerSecond: any;
}

@Component({
  selector: 'app-dashboard-bch',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponentBch implements OnInit {
  featuredAssets$: Observable<any>;
  network$: Observable<string>;
  mempoolBlocksData$: Observable<MempoolBlocksData>;
  mempoolInfoData$: Observable<MempoolInfoData>;
  mempoolLoadingStatus$: Observable<number>;
  bytesPerSecondLimit = 1667; // TODO: Should this limit not be changed for BCH?
  blocks$: Observable<BlockExtended[]>;
  transactions$: Observable<TransactionStripped[]>;
  latestBlockHeight: number;
  mempoolTransactionsWeightPerSecondData: any;
  mempoolStats$: Observable<MempoolStatsData>;
  transactionsWeightPerSecondOptions: any;
  isLoadingWebSocket$: Observable<boolean>;

  constructor(
    @Inject(LOCALE_ID) private locale: string,
    public stateService: StateService,
    private apiService: ApiService,
    private websocketService: WebsocketService,
    private seoService: SeoService,
    private storageService: StorageService,
  ) { }

  ngOnInit(): void {
    this.isLoadingWebSocket$ = this.stateService.isLoadingWebSocket$;
    this.seoService.resetTitle();
    this.websocketService.want(['blocks', 'stats', 'mempool-blocks', 'live-2h-chart']);
    this.network$ = merge(of(''), this.stateService.networkChanged$);
    this.mempoolLoadingStatus$ = this.stateService.loadingIndicators$
      .pipe(
        map((indicators) => indicators.mempool !== undefined ? indicators.mempool : 100)
      );

    this.mempoolInfoData$ = combineLatest([
      this.stateService.mempoolInfo$,
      this.stateService.bytesPerSecond$
    ])
    .pipe(
      map(([mempoolInfo, bytesPerSecond]) => {
        const percent = Math.round((Math.min(bytesPerSecond, this.bytesPerSecondLimit) / this.bytesPerSecondLimit) * 100);

        let progressColor = '#7CB342';
        if (bytesPerSecond > 1667) {
          progressColor = '#FDD835';
        }
        if (bytesPerSecond > 2000) {
          progressColor = '#FFB300';
        }
        if (bytesPerSecond > 2500) {
          progressColor = '#FB8C00';
        }
        if (bytesPerSecond > 3000) {
          progressColor = '#F4511E';
        }
        if (bytesPerSecond > 3500) {
          progressColor = '#D81B60';
        }

        const mempoolSizePercentage = (mempoolInfo.usage / mempoolInfo.maxmempool * 100);
        let mempoolSizeProgress = 'bg-danger';
        if (mempoolSizePercentage <= 50) {
          mempoolSizeProgress = 'bg-success';
        } else if (mempoolSizePercentage <= 75) {
          mempoolSizeProgress = 'bg-warning';
        }

        return {
          memPoolInfo: mempoolInfo,
          bytesPerSecond: bytesPerSecond,
          progressWidth: percent + '%',
          progressColor: progressColor,
          mempoolSizeProgress: mempoolSizeProgress,
        };
      })
    );

    this.mempoolBlocksData$ = this.stateService.mempoolBlocks$
      .pipe(
        map((mempoolBlocks) => {
          const size = mempoolBlocks.map((m) => m.blockSize).reduce((a, b) => a + b, 0);

          // TODO: Validate if the blocks should indeed be in bytes here for BCH
          return {
            size: size,
            blocks: this.stateService.blockSize
          };
        })
      );

    this.featuredAssets$ = this.apiService.listFeaturedAssets$()
      .pipe(
        map((featured) => {
          const newArray = [];
          for (const feature of featured) {
            if (feature.ticker !== 'L-BTC' && feature.asset) {
              newArray.push(feature);
            }
          }
          return newArray.slice(0, 4);
        }),
      );

    this.blocks$ = this.stateService.blocks$
      .pipe(
        tap(([block]) => {
          this.latestBlockHeight = block.height;
        }),
        scan((acc, [block]) => {
          if (acc.find((b) => b.height == block.height)) {
            return acc;
          }
          acc.unshift(block);
          acc = acc.slice(0, 6);

          if (this.stateService.env.MINING_DASHBOARD === true) {
            for (const block of acc) {
              // @ts-ignore: Need to add an extra field for the template
              block.extras.pool.logo = `/resources/mining-pools/` +
                block.extras.pool.name.toLowerCase().replace(' ', '').replace('.', '') + '.svg';
            }
          }

          return acc;
        }, []),
      );

    this.transactions$ = this.stateService.transactions$
      .pipe(
        scan((acc, tx) => {
          if (acc.find((t) => t.txid == tx.txid)) {
            return acc;
          }
          acc.unshift(tx);
          acc = acc.slice(0, 6);
          return acc;
        }, []),
      );

    this.mempoolStats$ = this.stateService.connectionState$
      .pipe(
        filter((state) => state === 2),
        switchMap(() => this.apiService.list2HStatistics$()),
        switchMap((mempoolStats) => {
          return merge(
            this.stateService.live2Chart$
              .pipe(
                scan((acc, stats) => {
                  acc.unshift(stats);
                  acc = acc.slice(0, 120);
                  return acc;
                }, mempoolStats)
              ),
            of(mempoolStats)
          );
        }),
        map((mempoolStats) => {
          return {
            mempool: mempoolStats,
            weightPerSecond: this.handleNewMempoolData(mempoolStats.concat([])),
          };
        }),
        share(),
      );
  }

  handleNewMempoolData(mempoolStats: OptimizedMempoolStats[]) {
    mempoolStats.reverse();
    const labels = mempoolStats.map(stats => stats.added);

    return {
      labels: labels,
      series: [mempoolStats.map((stats) => [stats.added * 1000, stats.bytes_per_second])],
    };
  }

  trackByBlock(index: number, block: BlockExtended) {
    return block.height;
  }
}
