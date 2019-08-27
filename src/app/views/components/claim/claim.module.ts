import { SharedModule } from './../../../shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClaimRoutingModule } from './claim-routing.module';
import { ClaimListComponent } from './claim-list/claim-list.component';
import { ClaimChasComponent } from './../../../components/claim/claim-chas/claim-chas.component';
import { ClaimManualComponent } from '../../../components/claim/claim-manual/claim-manual.component';

@NgModule({
  imports: [CommonModule, SharedModule, ClaimRoutingModule],
  declarations: [ClaimListComponent, ClaimChasComponent, ClaimManualComponent]
})
export class ClaimModule {}
