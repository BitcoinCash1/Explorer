import { Component, ChangeDetectionStrategy, OnChanges, Input, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Transaction } from '../../interfaces-bch/electrs.interface';
import { StateService } from '../../services/state-bch.service';
import { Subscription } from 'rxjs';
import { BlockExtended } from '../../interfaces-bch/node-api.interface';

@Component({
  selector: 'app-tx-fee-rating-bch',
  templateUrl: './tx-fee-rating.component.html',
  styleUrls: ['./tx-fee-rating.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TxFeeRatingComponentBch implements OnInit, OnChanges, OnDestroy {
  @Input() tx: Transaction;

  blocksSubscription: Subscription;

  medianFeeNeeded: number;
  overpaidTimes: number;
  feeRating: number;

  blocks: BlockExtended[] = [];

  constructor(
    private stateService: StateService,
    private cd: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    this.blocksSubscription = this.stateService.blocks$.subscribe(([block]) => {
      this.blocks.push(block);
      if (this.tx.status.confirmed && this.tx.status.block_height === block.height && block?.extras?.medianFee > 0) {
        this.calculateRatings(block);
        this.cd.markForCheck();
      }
    });
  }

  ngOnChanges() {
    this.feeRating = undefined;
    if (!this.tx.status.confirmed) {
      return;
    }

    const foundBlock = this.blocks.find((b) => b.height === this.tx.status.block_height);
    if (foundBlock && foundBlock?.extras?.medianFee > 0) {
      this.calculateRatings(foundBlock);
    }
  }

  ngOnDestroy() {
    this.blocksSubscription.unsubscribe();
  }

  calculateRatings(block: BlockExtended) {
    const feePerByte = this.tx.effectiveFeePerVsize || this.tx.fee / this.tx.size;
    this.medianFeeNeeded = block?.extras?.medianFee;

    // Block not filled
    if (block.size < this.stateService.blockSize * 0.95) {
      this.medianFeeNeeded = 1;
    }

    this.overpaidTimes = Math.round(feePerByte / this.medianFeeNeeded);

    if (feePerByte <= this.medianFeeNeeded || this.overpaidTimes < 2) {
      this.feeRating = 1;
    } else {
      this.feeRating = 2;
      if (this.overpaidTimes > 10) {
        this.feeRating = 3;
      }
    }
  }
}
