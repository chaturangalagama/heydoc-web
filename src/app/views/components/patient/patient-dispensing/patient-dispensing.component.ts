import { VisitManagementService } from './../../../../services/visit-management.service';
import { take } from 'rxjs/operators';

// General Libraries
import { FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Component, OnInit, HostListener, Input, EventEmitter, Output, OnDestroy } from '@angular/core';
import { Subscription, forkJoin } from '../../../../../../node_modules/rxjs';
import { Observable } from 'rxjs';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';
// Services
import { ConsultationFormService } from './../../../../services/consultation-form.service';
import { ApiCmsManagementService } from '../../../../services/api-cms-management.service';
import { ApiPatientVisitService } from '../../../../services/api-patient-visit.service';
import { PaymentService } from '../../../../services/payment.service';
import { StoreService } from '../../../../services/store.service';
import { AlertService } from '../../../../services/alert.service';
import { TempStoreService } from '../../../../services/temp-store.service';
// Components
import { MedicalCertificateItemsArrayComponent } from './../../../../components/consultation/consultation-medical-certificate/medical-certificate-items-array.component';
import { MedicalCertificateItemControlComponent } from '../../../../components/consultation/consultation-medical-certificate/medical-certificate-item-control.component';

// Objects
import { CHAS_BALANCE_UNAVAILABLE, INPUT_DELAY } from './../../../../constants/app.constants';

@Component({
  selector: 'app-patient-dispensing',
  templateUrl: './patient-dispensing.component.html',
  styleUrls: ['./patient-dispensing.component.scss']
})
export class PatientDispensingComponent implements OnInit, OnDestroy {
  // Output Variable to emit index of tab selected
  @Input() attachedMedicalCoverages: FormArray;
  @Input() chargeFormGroup: FormGroup;
  @Input() consultationFormGroup: FormGroup;
  @Output() tabSelected = new EventEmitter<String>();

  subscriptions = [];
  // userIdSet = new Set<string>();
  caseStatus;

  patientInfo;
  consultationInfo;
  paymentRequestInfo;
  error: string;
  drugErrors = [];
  isSave = false;
  navigatingUrl: string;
  isMedicalCoverageChanged = false;

  // patientCoverages = [];
  postConsultTempStoreKey = this.store.getPatientVisitRegistryId()
    ? 'POST_CONSULT_' + this.store.getPatientVisitRegistryId()
    : '';
  removeTempStoreUserName = false;
  access_token: string;

  constructor(
    private router: Router,
    private store: StoreService,
    private alertService: AlertService,
    private tempStore: TempStoreService,
    private apiCmsManagementService: ApiCmsManagementService,
    private apiPatientVisitService: ApiPatientVisitService,
    private paymentService: PaymentService,
    private consultationFormService: ConsultationFormService,
    private fb: FormBuilder,
    private visitManageService: VisitManagementService
  ) {}

  ngOnInit() {
    if (!this.store.getPatientId()) {
      alert('No Patient Details');
      this.router.navigate(['pages/patient/list']);
      return;
    }

    this.updateFormGroup();

    this.store
      .getPatientVisitIdRefresh()
      .pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(res => {
        if (res) {
          console.log('id changed: ', res);
          // this.resetForms();
          // this.getPatientDetails();
          this.updateFormGroup();
        }
      });
  }

  // getPatientDetails() {
  //   this.getCaseDetails();
  // }

  getVisitDetails() {
    this.apiPatientVisitService
      .patientVisitSearch(this.store.getPatientVisitRegistryId())
      .pipe(debounceTime(INPUT_DELAY))
      .subscribe(
        res => {
          console.log('res info: ', res);
          this.paymentService.setConsultationInfo(res.payload);
          this.consultationInfo = res.payload;
          this.updateFormGroup();
        },
        err => this.alertService.error(JSON.stringify(err.error.message))
      );
  }

  resetForms() {
    this.consultationFormService.resetForm();
    this.paymentService.resetVisitCoverageArray();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      (subscription as Subscription).unsubscribe();
    });
  }

  getCoverageDetails(payload) {
    const attachedMedicalCoverage: Array<any> = payload.coverages;
    const coverageLimitFormGroup = this.chargeFormGroup.get('coverageLimitFormGroup');
    const coverageLimitArray = coverageLimitFormGroup.get('coverageLimitArray') as FormArray;

    while (coverageLimitArray.length > 0) {
      coverageLimitArray.removeAt(0);
    }

    console.log('#0005 attachedMedicalCoverage: ', attachedMedicalCoverage);
    console.log('#0005 coverageLimitArray: ', coverageLimitArray);

    attachedMedicalCoverage.forEach(element => {
      const coverage = this.store.getMedicalCoverageByPlanId(element.planId);
      const plan = coverage.coveragePlans.find(x => {
        return x.id === element.planId;
      });
      const coverageLimitItem = this.createCoverageLimitItem(coverage, plan);
      console.log('#0005 coverageLimitItem: ', coverageLimitItem);
      coverageLimitArray.push(coverageLimitItem);
    });
  }

  createVisitCoverageArrayItem(coverage, plan) {
    const item = {
      name: `${coverage.name}\n${plan.name}`,
      type: coverage.type,
      planDetail: plan
    };
    return item;
  }

  createCoverageLimitItem(coverage, plan) {
    const initialLimit = plan.capPerVisit.limit || 0;
    const coverageLimitItem = this.fb.group({
      name: `${coverage.name}\n${plan.name}`,
      planId: plan.id,
      type: coverage.type,
      initialLimit: { value: initialLimit, disabled: true },
      updatedLimit: initialLimit,
      disabled: coverage.type === 'CORPORATE' ? true : false
    });

    coverageLimitItem.valueChanges
      .pipe(
        distinctUntilChanged(),
        debounceTime(200)
      )
      .subscribe(values => {
        if (values.updatedLimit == null) {
          return;
        }
        this.updateOverallPrice();
      });

    return coverageLimitItem;
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeunloadHandler($event: any) {
    return false;
  }

  onKeyUp(event: KeyboardEvent) {
    if (event.code === '0x003E' && this.chargeFormGroup.valid) {
      this.onBtnSaveClicked();
    }
  }

  // Main
  updateFormGroup() {
    const dispatchItemEntities = this.consultationFormGroup.get('dispatchItemEntities') as FormArray;
    if (dispatchItemEntities != undefined && this.consultationInfo.visitStatus == 'CLOSED') {
      dispatchItemEntities.value.forEach(element => {
        element.disable();
      });
    }
    this.updateOverallPrice();
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.keyCode === 115) {
      console.log('F4');
      if (this.consultationInfo && this.chargeFormGroup.valid) {
        this.onBtnSaveClicked();
      }
    }
  }

  // Overall Charge
  updateOverallPrice() {
    const overallCharges = [];
    const dispatchItemEntities = this.consultationFormGroup.get('dispatchItemEntities') as FormArray;
    const chargeDetails =
      dispatchItemEntities.value
        .filter(item => item.drugId !== '')
        .map(item => {
          const itemDetail = this.store.chargeItemList
            .map(obj => obj.item)
            .find(chargeItem => chargeItem.id === item.drugId);
          console.log('detail', itemDetail, item);
          return {
            itemId: item.drugId,
            quantity: item.purchaseQty || 0,
            itemPriceAdjustment: {
              adjustedValue: item.priceAdjustment.adjustedValue || 0,
              paymentType: item.priceAdjustment.paymentType || 'DOLLAR'
            },
            excludedPlans:
              (Array.isArray(item.excludedCoveragePlanIds)
                ? item.excludedCoveragePlanIds
                : [item.excludedCoveragePlanIds]) || []
            // excludedPlans : []
          };
        }) || [];
    console.log('items', chargeDetails);

    const coverageLimitFormGroup = this.chargeFormGroup.get('coverageLimitFormGroup');
    const coverageLimitArray = coverageLimitFormGroup.get('coverageLimitArray') as FormArray;
    const itemsToInvoice = {
      planMaxUsage: coverageLimitArray.value.reduce((obj, item) => {
        obj[item.planId] = item.updatedLimit;
        return obj;
      }, {}),
      chargeDetails
    };

    // this.apiCaseManagerService
    //   .getDynamicInvoiceBreakdown(this.store.getCaseId(), itemsToInvoice)
    //   .pipe(
    //     debounceTime(INPUT_DELAY),
    //     distinctUntilChanged()
    //   )
    //   .subscribe(
    //     res => {
    //       const invoices = res.payload;
    //       let totalAmount = 0;
    //       console.log('invoices', invoices);

    //       invoices.forEach(invoice => {
    //         console.log('invoice', invoice.invoiceType);
    //         overallCharges.push({
    //           paymentMode: invoice.invoiceType === 'DIRECT' ? 'Cash' : invoice.invoiceType,
    //           charge: invoice.payableAmount - invoice.taxAmount,
    //           gst: invoice.taxAmount,
    //           planName: invoice.planName || '',
    //           planId: invoice.planId || ''
    //         });

    //         totalAmount += invoice.payableAmount;
    //       });

    //       const overallChargeFormGroup = this.chargeFormGroup.get('overallChargeFormGroup');
    //       overallChargeFormGroup.patchValue({
    //         overallCharges: { value: overallCharges },
    //         totalAmount: totalAmount
    //       });
    //       overallChargeFormGroup.updateValueAndValidity();
    //     },
    //     err => this.alertService.error(JSON.stringify(err.error.message))
    //   );
  }

  // Action
  onBtnSaveClicked() {
    console.log('this.consultationInfo: ', this.consultationInfo);

    this.paymentRequestInfo = { ...this.consultationFormGroup.value };
    this.paymentRequestInfo.diagnosisIds = this.consultationFormGroup.get('diagnosisIds').value;
    this.paymentRequestInfo.patientReferral.patientReferrals = this.consultationFormGroup
      .get('patientReferral')
      .get('patientReferrals').value;

    if (this.paymentRequestInfo) {
      // this.paymentRequestInfo.dispatchItemEntities = this.caseChargeFormService.bindChargeItemsToDispatchitemEntities(
      //   this.consultationFormGroup.get('dispatchItemEntities')['controls']
      // );
      this.paymentRequestInfo = this.consultationFormService.flattenDiagnosis(this.paymentRequestInfo);
      this.paymentRequestInfo = this.consultationFormService.checkConsultation(this.paymentRequestInfo);
      this.paymentRequestInfo = this.consultationFormService.checkPatientReferral(this.paymentRequestInfo);
      this.paymentRequestInfo = MedicalCertificateItemsArrayComponent.checkMedicalCertificates(this.paymentRequestInfo);
      this.paymentRequestInfo = this.consultationFormService.checkFollowUp(this.paymentRequestInfo);

      const maxUsageValue = this.chargeFormGroup.get('coverageLimitFormGroup').get('coverageLimitArray').value;
      if (maxUsageValue) {
        this.paymentRequestInfo.planMaxUsage = maxUsageValue.reduce((obj, item) => {
          obj[item.planId] = item.updatedLimit;
          return obj;
        }, {});
      }
    }

    this.apiPatientVisitService.payment(this.store.getPatientVisitRegistryId(), this.paymentRequestInfo).subscribe(
      res => {
        this.paymentService.setConsultationInfo(null);
        if (res.payload.visitStatus === 'PAYMENT') {
          this.store.setVisitStatus('PAYMENT');
        }

        // Switch to Printing Tab
        this.store.setPatientVisitRegistryId(this.store.getPatientVisitRegistryId(), true); // --> To refresh
        this.tabSelected.emit('Printing');
        this.visitManageService.setQueueRefresh();
      },
      err => this.alertService.error(JSON.stringify(err.error.message))
    );
  }

  handleChargeItemChange(event) {
    console.log('event', event);
    this.updateOverallPrice();
  }
}
