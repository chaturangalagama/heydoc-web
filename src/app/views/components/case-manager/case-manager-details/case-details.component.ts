import { Component, OnInit, ViewChild } from '@angular/core';
import { DatatableComponent } from '@swimlane/ngx-datatable';
import { StoreService } from '../../../../services/store.service';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { ApiCaseManagerService } from '../../../../services/api-case-manager.service';
import { AlertService } from '../../../../services/alert.service';
import { ApiPatientVisitService } from '../../../../services/api-patient-visit.service';
import { FormGroup, FormControl, FormBuilder, FormArray } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap';
import { CaseManagerAttachVisitComponent } from '../../../../components/case-manager/case-manager-attach-visit/case-manager-attach-visit.component';
import { CaseChargeFormService } from '../../../../services/case-charge-form.service';
import { CaseManagerNewPaymentComponent } from '../../../../components/case-manager/case-manager-new-payment/case-manager-new-payment.component';
import { CaseManagerCloseCaseComponent } from '../../../../components/case-manager/case-manager-close-case/case-manager-close-case.component';
import { CaseManagerDeletePaymentComponent } from '../../../../components/case-manager/case-manager-delete-payment/case-manager-delete-payment.component';
import { Case, Invoices } from '../../../../objects/Case';
import moment = require('moment');
import { CaseManagerDeleteVisitComponent } from '../../../../components/case-manager/case-manager-delete-visit/case-manager-delete-visit.component';
import { sample } from 'rxjs/operators';

@Component({
  selector: 'app-case-details',
  templateUrl: './case-details.component.html',
  styleUrls: ['./case-details.component.scss']
})

export class CaseDetailsComponent implements OnInit {

  @ViewChild(DatatableComponent) table: DatatableComponent;
  @ViewChild('tableWrapper') tableWrapper;
  @ViewChild('containerFluid') container;

  salesOrder: any;
  visits = [];
  visit: any;
  invoices = [];
  packageCompletedItems: number;
  rows: any[];
  bsModalRef: BsModalRef;
  caseChargeForm: FormGroup;
  caseSampleFormGroup:FormGroup;
  items: FormArray;
  chargesSummary = {
    chargesTotal: 0,
    gSTTotal: 0,
    payableTotal: 0,
    coverageTotal: 0
  }
  case: Case;
  purchasedPackageDates = {
    purchaseDate: null,
    expireDate: null,
    utilizedDate: null
  }
  deletedInvoices: Invoices[] = [];
  activeInvoices: Invoices[] = [];
  newPurchaseItems = [];
  utilizeDisable = [];
  payableDisable = [];
  paymentTypes = [];
  // chargeBreakdown = {
  //   totalDue: 0
  // }
  totalDue: string;

  constructor(
    private store: StoreService,
    private authService: AuthService,
    private apiCaseManagerService: ApiCaseManagerService,
    private apiPatientVisitService: ApiPatientVisitService,
    private alertService: AlertService,
    private router: Router,
    private formBuilder: FormBuilder,
    private modalService: BsModalService,
    private caseChargeFormService: CaseChargeFormService
  ) { }

  ngOnInit(): void {
    if (
      localStorage.getItem('access_token') &&
      localStorage.getItem('clinicCode') &&
      localStorage.getItem('clinicId')
    ) {
      this.store.clinicCode = localStorage.getItem('clinicCode');
      this.store.clinicId = localStorage.getItem('clinicId');
    } else {
      alert('Clinic is not selected.');
      localStorage.removeItem('access_token');
      this.authService.logout();
      console.log('Access Denied');
      this.router.navigate(['login']);
    }

    this.caseSampleFormGroup = this.formBuilder.group({
      gstValue: 0.07,
      totalAmount: 0,
      overallCharges: { value: [{
        paymentMode: 'Cash',
        charge: 10,
        gst: 0.26
      },
      {
        paymentMode: 'Direct',
        charge: 10,
        gst: 0.26
      }] }
    });

  //  this.caseSampleFormGroup.get('overallCharges').value.push(sampleCharge);
    this.getCaseDetails();
    this.getPaymentTypes();
  }

  getCaseDetails() {
    if (this.store.getCaseId) {
      this.apiCaseManagerService.searchCase(this.store.getCaseId()).subscribe(pagedData => {
        console.log('Search Case', pagedData);
        if (pagedData) {
          const { payload } = pagedData;
          this.populateData(payload);
        }
        return pagedData;
      },
        err => {
          this.alertService.error(JSON.stringify(err.error.message));
        });
    }
  }

  populateData(data: Case) {
    this.case = data;
    this.getVisitData();
    this.invoices = this.case.salesOrder['invoices'];
    this.totalDue = this.case.salesOrder.outstanding;
    this.formatPackageDate();
    this.getPackageCompletedItems();
    this.calculateChargeSummaryAndInvoiceSeperation();
    this.updateFormForLastPurchaseItems();
  }

  updateFormForLastPurchaseItems() {
    this.caseChargeForm = this.formBuilder.group({
      chargeItem: this.formBuilder.group({
        chargeItemDetails: this.caseChargeFormService.addMultipleChargeItems(false, this.case.salesOrder.purchaseItem.length)
      })
    });

    const formArr = this.caseChargeForm.get('chargeItem').get('chargeItemDetails')['controls']
    if (formArr) {
      for (let i = 0; i < formArr.length; i++) {
        const purchaseItem = this.case.salesOrder.purchaseItem[i];
        formArr[i].patchValue({
          drugId: purchaseItem['itemRefId'],
          batchNumber: purchaseItem['batchNo'],
          expiryDate: purchaseItem['expireDate'],
          remark: purchaseItem['remarks'],
          dose: {
            'uom': purchaseItem['purchaseUom'],
            'quantity': purchaseItem['dosage'],
          },
          instruction: {
            'code': purchaseItem['instruct']
          },
          purchaseQty: purchaseItem['purchaseQty'],
          excludedCoveragePlanIds: purchaseItem['excludedCoveragePlanIds'],
          duration: purchaseItem['duration'],
          salesItemCode: purchaseItem['salesItemCode'],
          cost: {
            'price': purchaseItem.cost['price'],
            'taxIncluded': purchaseItem.cost['taxIncluded'],
          },
          isChecked: false,
          unitPrice: {
            'price': purchaseItem.unitPrice['price'],
            'taxIncluded': purchaseItem.unitPrice['taxIncluded'],
          }
        });
      }
    }
    if (formArr !== undefined && this.case.status === 'CLOSED')
      formArr.forEach(element => { element.disable() });
  }

  getPackageCompletedItems() {
    this.packageCompletedItems = 0;
    let i = 0;
    this.utilizeDisable = [];
    this.payableDisable = [];
    this.case.purchasedPackage.dispatches.forEach(item => {
      if (item.utilize === true) {
        this.packageCompletedItems += 1;
        this.utilizeDisable[i] = true;
      }
      else
        this.utilizeDisable[i] = false;
      if (item.payable === true)
        this.payableDisable[i] = true;
      else
        this.payableDisable[i] = false;
      i++;
    });
  }

  formatPackageDate() {
    if (this.case.purchasedPackage['purchaseDate'] !== undefined && this.case.purchasedPackage['expireDate'] !== undefined) {
      this.purchasedPackageDates.purchaseDate = moment(moment(this.case.purchasedPackage['purchaseDate'], 'DD-MM-YYYYT00:00:00')).format('DD-MM-YYYY');
      this.purchasedPackageDates.expireDate = moment(moment(this.case.purchasedPackage['expireDate'], 'DD-MM-YYYYT00:00:00')).format('DD-MM-YYYY');
    }
    this.case.purchasedPackage.dispatches.forEach(item => {
      this.purchasedPackageDates.utilizedDate = moment(moment(item.utilizedDate, 'DD-MM-YYYYT00:00:00')).format('DD-MM-YYYY');
    });
  }

  calculateChargeSummaryAndInvoiceSeperation() {
    this.deletedInvoices = [];
    this.activeInvoices = [];
    this.chargesSummary = {
      chargesTotal: 0,
      gSTTotal: 0,
      payableTotal: 0,
      coverageTotal: 0
    }
    this.invoices.forEach(invoice => {
      if (invoice['invoiceState'] === "DELETED") {
        this.deletedInvoices.push(invoice);
        this.deletedInvoices.push(invoice);
      }
      else
        this.activeInvoices.push(invoice);
    });

    if (this.activeInvoices.length === 0) {
      this.chargesSummary.chargesTotal = 0;
      this.chargesSummary.gSTTotal = 0;
      this.chargesSummary.payableTotal = 0;
      this.chargesSummary.coverageTotal = 0;
    }
    else {
      this.activeInvoices.forEach(invoice => {
        this.chargesSummary.chargesTotal += Number(invoice["payableAmount"]) - Number(invoice["includedTaxAmount"] / 100);
        this.chargesSummary.gSTTotal += Number(invoice["includedTaxAmount"] / 100);
        this.chargesSummary.payableTotal += Number(invoice["payableAmount"]);
        if (invoice.paymentMode !== 'CASH' && invoice["coverage"] !== undefined)
          this.chargesSummary.coverageTotal += Number(invoice["coverage"]);
      });
    }
  }

  getVisitData() {
    this.apiPatientVisitService.getVisit(this.case.caseId).subscribe(data => {
      console.log('Visit ', data);
      if (data) {
        const { payload } = data;
        this.formatVisits(payload);
      }
      return data;
    },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
      });
  }

  formatVisits(visits) {
    this.visits = visits.map((payload) => {
      const tempVisit = {
        visitId: payload.visitId,
        clinicName: payload.clinicName,
        visitDate: moment(moment(payload.startTime, 'DD-MM-YYYYT00:00:00')).format('DD-MM-YYYY'),
        diagnosis: payload.diagnosisEntities,
        drugDispatch: payload.medicalReferenceEntity.dispatchItemEntities
      };
      return tempVisit;
    });
    if (this.visits[0] !== undefined)
      this.onClickVisitRow(this.visits[0].visitId);
  }

  onClickVisitRow(visitId) {
    this.visit = this.visits.find(obj => {
      return obj.visitId === visitId
    })
  }

  toggleExpandRow(row) {
    console.log('Toggled Expand Row!', row);
    this.table.rowDetail.toggleExpandRow(row);
  }

  backToAllCases() {
    this.router.navigate(['/pages/case/list']);
    return false;
  }

  attachNewVisit() {
    const initialState = {
      title: 'ATTACH NEW VISIT',
      patientId: this.store.getPatientId()
    };

    this.bsModalRef = this.modalService.show(CaseManagerAttachVisitComponent, {
      initialState,
      class: 'app-modal-window',
      keyboard: false,
      backdrop: 'static'
    });

    this.bsModalRef.content.event.subscribe(
      data => {
        this.getCaseDetails();
        this.bsModalRef.content.event.unsubscribe();
      },
      err => {
        this.alertService.error(err.error.message);
      }
    );
  }

  closeCase() {
    const initialState = {
      title: 'CLOSE CASE',
      caseId: this.store.getCaseId(),
      outstanding: this.case.salesOrder['outstanding']
    };
    this.bsModalRef = this.modalService.show(CaseManagerCloseCaseComponent, {
      initialState,
      class: 'modal-sm',
      keyboard: false,
      backdrop: 'static'
    });
  }

  onDeleteVisit(visitId) {
    const initialState = {
      title: 'DELETE VISIT',
      visitId: visitId
    };

    this.bsModalRef = this.modalService.show(CaseManagerDeleteVisitComponent, {
      initialState,
      class: 'modal-sm',
      keyboard: false,
      backdrop: 'static'
    });

    this.bsModalRef.content.event.subscribe(
      data => {
        this.getCaseDetails();
        this.bsModalRef.content.event.unsubscribe();
      },
      err => {
        this.alertService.error(err.error.message);
      }
    );
  }

  getPaymentTypes() {
    this.apiCaseManagerService.getPaymentTypes().subscribe(data => {
      console.log('Get Payment Types', data);
      if (data) {
        const { payload } = data;
        this.paymentTypes = payload;
      }
      return data;
    },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
      });
  }

  createNewInvoice() {
    const initialState = {
      title: 'New Payment',
      invoices: this.activeInvoices,
      paymentTypes: this.paymentTypes
    };
    this.bsModalRef = this.modalService.show(CaseManagerNewPaymentComponent, {
      initialState,
      class: 'app-modal-window',
      keyboard: false,
      backdrop: 'static'
    });
    this.bsModalRef.content.event.subscribe(data => {
      this.bsModalRef.hide();
      this.recordPayment(data);
    });
  }

  recordPayment(newPayment) {
    this.apiCaseManagerService.recordNewPayment(this.store.getCaseId(), newPayment).subscribe(data => {
      if (data.statusCode === 'S0000') {
        this.getCaseDetails();
        alert('Case details has been updated.');
      } else {
        alert(data.message);
      }
    },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
      });
  }

  onDeletePayment(index) {
    const initialState = {
      title: 'Remove Payment?'
    };
    this.bsModalRef = this.modalService.show(CaseManagerDeletePaymentComponent, {
      initialState,
      class: 'app-modal-window',
      keyboard: false,
      backdrop: 'static'
    });
    this.bsModalRef.content.event.subscribe(reason => {
      this.bsModalRef.hide();
      this.deletePaymentRequest(this.activeInvoices[index]['invoiceId'], reason);
    });
  }

  deletePaymentRequest(invoiceId, reason) {
    this.apiCaseManagerService.deletePayment(this.store.getCaseId(), invoiceId, reason).subscribe(data => {
      console.log('Delete Payment', data);
      if (data.statusCode === 'S0000') {
        this.getCaseDetails();
        alert('Case details has been updated.');
      } else {
        alert(data.message);
      }
    },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
      });
  }

  bindChargeItemsToPurchaseItem() {
    const formArr = this.caseChargeForm.get('chargeItem').get('chargeItemDetails')['controls'];
    console.log("formArr = ", formArr);
    if (formArr) {
      this.newPurchaseItems = formArr.filter(function (payload) {
        if (payload.value.drugId === '' || payload.value.drugId === undefined || payload.value.drugId === null)
          return false;
        return true;
      }).map((payload) => {
        if (payload.value.drugId === '')
          return null;
        const tempItem = {
          itemRefId: payload.value.drugId,
          subItems: null,
          cost: {
            price: payload.value.cost.price,
            taxIncluded: payload.value.cost.taxIncluded
          },
          unitPrice: {
            price: payload.value.unitPrice.price,
            taxIncluded: payload.value.unitPrice.taxIncluded
          },
          dosage: payload.value.dose.quantity,
          purchaseUom: payload.value.dose.uom,
          duration: payload.value.duration,
          purchaseQty: payload.value.purchaseQty,
          instruct: payload.value.instruction.code,
          batchNo: payload.value.batchNumber,
          expireDate: payload.value.expiryDate,
          priceAdjustment: {
            adjustedValue: payload.value.decreaseValue,
            paymentType: payload.value.paymentType
          },
          remarks: payload.value.remark,
          excludedCoveragePlanIds: payload.value.excludedCoveragePlanIds
        };
        return tempItem;
      });
    }
    this.case.salesOrder.purchaseItem = this.newPurchaseItems;
    console.log("purchaseItem = ", this.case.salesOrder.purchaseItem);
  }

  saveCase() {
    this.bindChargeItemsToPurchaseItem();
    this.apiCaseManagerService.update(this.store.getCaseId(), this.case).subscribe(data => {
      console.log('Update Case', data);
      if (data.statusCode === 'S0000') {
        alert('Case details has been updated.')
        const { payload } = data;
        this.populateData(payload);
      }
      else
        alert(data.message);
    },
      err => {
        if (err.error)
          this.alertService.error(JSON.stringify(err.error.message));
      });
  }

  utilizeCheckBoxvalue(event, index) {
    if (event === "T")
      this.case.purchasedPackage.dispatches[index].utilize = true;
    else
      this.case.purchasedPackage.dispatches[index].utilize = false;
  }

  payableCheckBoxvalue(event, index) {
    if (event === "T")
      this.case.purchasedPackage.dispatches[index].payable = true;
    else
      this.case.purchasedPackage.dispatches[index].payable = false;
  }

  onFirstChargeItemDetailsAdded(event: FormArray) {
    console.log('chargeItemDetails event', event);
    this.caseChargeForm = this.formBuilder.group({
      chargeItem: this.formBuilder.group({
        chargeItemDetails: event
      })
    });
  }

  handleChargeItemChange(event) {
    console.log('handleChargeItemChange event', event);
    let chargeItems = [];
    const formArr = this.caseChargeForm.get('chargeItem').get('chargeItemDetails')['controls'];
    if (formArr) {
      chargeItems = formArr.filter(function (payload) {
        if (payload.value.drugId === '' || payload.value.drugId === undefined || payload.value.drugId === null)
          return false;
        if (payload.value.purchaseQty === '' || payload.value.purchaseQty === null || payload.value.purchaseQty === undefined)
          payload.value.purchaseQty = 0;
        return true;
      }).map((payload) => {
        if (payload.value.drugId === '')
          return null;
        const tempItem = {
          itemId: payload.value.drugId,
          purchaseQty: Number(payload.value.purchaseQty),
          excludePlanIds: payload.value.excludedCoveragePlanIds
        };
        return tempItem;
      });
    }
    this.apiCaseManagerService.getInvoicesUpdates(this.store.getCaseId(), chargeItems).subscribe(data => {
      if (data.statusCode === 'S0000') {
        const { payload } = data;
        this.updateChargeBreackdown(payload);
      }
      else
        alert(data.message);
    },
      err => {
        if (err.error)
          this.alertService.error(JSON.stringify(err.error.message));
      });
  }

  updateChargeBreackdown(payload) {
    this.totalDue = '0.00';
    let totalPrice = 0;
    Object.keys(payload['prices']).forEach(function (key) {
      totalPrice += Number(payload['prices'][key]);
    });
    if (payload['totalPaid'])
      this.totalDue = (totalPrice - payload['totalPaid']) + '';
  }

}
