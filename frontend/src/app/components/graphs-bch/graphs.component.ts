import { Component, OnInit } from '@angular/core';
import { StateService } from '../../services/state-bch.service';
import { WebsocketService } from '../../services/websocket-bch.service';

@Component({
  selector: 'app-graphs-bch',
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.scss'],
})
export class GraphsComponentBch implements OnInit {
  padding = 'w-50';

  constructor(
    public stateService: StateService,
    private websocketService: WebsocketService
  ) { }

  ngOnInit(): void {
    this.websocketService.want(['blocks']);
  }
}
