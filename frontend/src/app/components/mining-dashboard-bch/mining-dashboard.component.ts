import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '../../services/seo-bch.service';
import { WebsocketService } from '../../services/websocket-bch.service';

@Component({
  selector: 'app-mining-dashboard-bch',
  templateUrl: './mining-dashboard.component.html',
  styleUrls: ['./mining-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiningDashboardComponentBch implements OnInit {
  constructor(
    private seoService: SeoService,
    private websocketService: WebsocketService,
  ) {
    this.seoService.setTitle($localize`:@@a681a4e2011bb28157689dbaa387de0dd0aa0c11:Mining Dashboard`);
  }

  ngOnInit(): void {
    this.websocketService.want(['blocks', 'mempool-blocks', 'stats']);
  }
}
