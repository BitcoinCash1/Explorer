import { Pipe, PipeTransform } from '@angular/core';
import { StateService } from '../../../services/state-bch.service';

@Pipe({
  name: 'relativeUrl'
})
export class RelativeUrlPipe implements PipeTransform {

  constructor(
    private stateService: StateService,
  ) { }

  transform(value: string): string {
    let network = this.stateService.network;
    if (this.stateService.env.BASE_MODULE !== 'mempool' && this.stateService.env.BASE_MODULE !== 'mempool.cash') {
      network = '';
    }
    return (network ? '/' + network : '') + value;
  }

}
