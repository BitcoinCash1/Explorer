import { Component, ChangeDetectionStrategy, OnChanges, Input } from '@angular/core';
import { Transaction } from '../../interfaces-bch/electrs.interface';

@Component({
  selector: 'app-tx-features-bch',
  templateUrl: './tx-features.component.html',
  styleUrls: ['./tx-features.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TxFeaturesComponentBch implements OnChanges {
  @Input() tx: Transaction;

  constructor() { }

  ngOnChanges() {
    if (!this.tx) {
      return;
    }
    // this.tx.vin.some((v) => v.sequence < 0xfffffffe);
    // this.isTaproot = this.tx.vin.some((v) => v.prevout && v.prevout.scriptpubkey_type === 'v1_p2tr');
  }
}
