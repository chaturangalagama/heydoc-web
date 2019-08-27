import { DosageInstruction } from './../../../../objects/DrugItem';
import { Uom } from './../../../../objects/Uom';
import { CaseChargeFormService } from './../../../../services/case-charge-form.service';
import { ApiPatientVisitService } from './../../../../services/api-patient-visit.service';
import { map, distinctUntilChanged, debounceTime, filter,tap,switchMap } from 'rxjs/operators';
import { StoreService } from '../../../../services/store.service';
import { DISPLAY_DATE_FORMAT, INPUT_DELAY } from '../../../../constants/app.constants';
import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray, FormBuilder, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import * as moment from 'moment';
import { ChargeItemDescription } from '../../../../objects/ChargeItemDescription';
import { ApiCaseManagerService } from '../../../../services/api-case-manager.service';
import { AlertService } from '../../../../services/alert.service';
import { ApiCmsManagementService } from '../../../../services/api-cms-management.service';
import { Case } from '../../../../objects/Case';
import { take } from 'rxjs/operators';
import { mulitplierValidator } from './../../../../services/consultation-form.service';
@Component({
  selector: 'app-case-charge-item',
  templateUrl: './case-charge-item.component.html',
  styleUrls: ['./case-charge-item.component.scss']
})
export class CaseChargeItemComponent implements OnInit {
  @Input() prescriptionItem: FormGroup;
  @Input() index: number;
  @Input() isAllCheck: boolean;
  @Output() onTopChargeItemDescriptionChanged = new EventEmitter<ChargeItemDescription>();
  @Output() onHandleChargeItemChange = new EventEmitter<any>();

  dosageMin = 1;
  loading = false;
  defaultQty = 1;
  chargeItems = [];
  plansInSO = [];
  instructions = [];
  baseUom = [];
  selectedItems = [];
  topChargeItemDescription: ChargeItemDescription;
  dosageInstructions: Array<DosageInstruction>;
  dosageInstruction: FormControl;
  adjustedUnitPrice: FormControl;
  codesTypeahead = new Subject<string>();
  currentDosageInstruction: string;
  totalPrice: number;
  case: Case;
  itemSelected;
  isDiscountShown = false;
  minDate: Date;
  unitPriceDisplay: string;
  adjustedUnitPriceDisplay: string;
  dataFromConsult = false;
  private onQtyChange: Subject<string> = new Subject();

  constructor(
    private store: StoreService,
    private fb: FormBuilder,
    private apiCaseManagerService: ApiCaseManagerService,
    private alertService: AlertService,
    private apiCmsManagementService: ApiCmsManagementService,
    private caseChargeFormService: CaseChargeFormService
  ) {}

  ngOnInit() {
    console.log('prescriptionItem', this.prescriptionItem);
    this.getChargeItems();
    this.initItemDetails();
    this.subscribeChange();
    this.getCaseDetails();
    this.setMandatoryFields();
    this.disableFields();

    this.onFilterInputChanged();
  }

  initItemDetails() {
    this.minDate = new Date();
    this.adjustedUnitPrice = new FormControl();
    this.topChargeItemDescription = { charge: '', cautionary: '', sig: '', remarks: '' };
    this.instructions = this.store.getInstructions();
    this.dosageInstructions = this.store.getDosageInstructions();
    this.dosageInstruction = new FormControl();
    this.baseUom = this.store.uoms;
    const tempItem = this.chargeItems.find(item => {
      return item.id === this.prescriptionItem.get('drugId').value;
    });

    if (tempItem) {
      console.log('tempItem: ', tempItem);
      this.itemSelected = tempItem ? tempItem.item : [];
      if (
        this.prescriptionItem.get('purchaseQty').value === 0 ||
        this.prescriptionItem.get('purchaseQty').value === ''
      ) {
        this.getCaseItemPrice(1);
      } else {
        this.getCaseItemPrice(this.prescriptionItem.get('purchaseQty').value);
      }

      // console.log("item selected: ",this.itemSelected);
      this.fillItemValues(this.prescriptionItem.get('drugId').value);
      this.disableFields();
      this.setMandatoryFields();
    }
  }

  onKeyUp() {
    this.onHandleChargeItemChange.emit({});
    // this.onQtyChange.next(qtyValue);
  }

  onItemSelect(item: any) {
    let plans = this.prescriptionItem.get('excludedCoveragePlanIds').value;
    if (item) {
      const index: number = plans.indexOf(item['planId']);
      if (index !== -1) {
        plans.splice(index, 1);
      }
    }
    console.log('plan Selected', this.prescriptionItem.get('excludedCoveragePlanIds').value);
    this.onHandleChargeItemChange.emit({});
  }

  onItemDeSelect(item: any) {
    let plans = this.prescriptionItem.get('excludedCoveragePlanIds').value;
    plans.push(item['value']['planId']);
    console.log('plan deSelected', this.prescriptionItem.get('excludedCoveragePlanIds').value);
    this.onHandleChargeItemChange.emit({});
  }

  onDosageInstructionSelect(option) {
    if (option) {
      console.log('Dosage Instruction', option);
      // this variable to store the original instruction and to be used in case replacement is needed
      this.currentDosageInstruction = option.instruct;
      const dosageInstruct = this.prescriptionItem.get('dosageInstruction').get('instruct');

      dosageInstruct.patchValue(option.instruct);
    }
  }

  onClear() {
    let plans = this.prescriptionItem.get('excludedCoveragePlanIds').value;
    plans.splice(0);
    this.plansInSO.forEach(element => {
      plans.push(element['planId']);
    });
    console.log('plan clear', this.prescriptionItem.get('excludedCoveragePlanIds').value);
    this.onHandleChargeItemChange.emit({});
  }

  subscribeChange() {

    this.prescriptionItem
      .get('drugId')
      .valueChanges.pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged((a, b) => {
          return a === b;
        })
      )
      .subscribe(data => {
        // const drugDataId = data.drugId;
        const drugDataId = data;
        console.log('drug id changed: ', drugDataId);
        if (drugDataId !== '') {
          this.itemSelected = this.chargeItems.find(item => {
            return item.id === drugDataId;
          });
          console.log('itemSelected: ', this.itemSelected);
          this.fillItemValues(data);

        }
      });

    this.prescriptionItem
      .get('instruction')
      .get('code')
      .valueChanges.pipe(debounceTime(INPUT_DELAY))
      .subscribe(data => {
        this.updateInstructionToTopDescription(this.prescriptionItem.get('instruction').value);
      });
    this.prescriptionItem
      .get('dose')
      .get('uom')
      .valueChanges.pipe(debounceTime(INPUT_DELAY))
      .subscribe(data => {
        this.topChargeItemDescription.uom = data;
        this.updateTopDescription();
      });
    this.prescriptionItem
      .get('dose')
      .get('quantity')
      .valueChanges.pipe(debounceTime(INPUT_DELAY))
      .subscribe(data => {
      });

    // Dosage Instruction Changes
    this.prescriptionItem
      .get('dosageInstruction')
      .get('code')
      .valueChanges.pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged()
      )
      .subscribe(value => {
        const dosageInstructionInstruct = this.prescriptionItem.get('dosageInstruction').get('instruct');
        this.getDosageInstruction(value);
        this.updateDosageInstructionToTopDescription(dosageInstructionInstruct.value);

        if (dosageInstructionInstruct.value.includes('#')) {
          this.patchDosageInstruction();
        } else {
          this.disableDosageQuantity();
        }
      });

    this.prescriptionItem
      .get('purchaseQty')
      .valueChanges.pipe(debounceTime(INPUT_DELAY))
      .subscribe(data => {
        let qty = data;
        if (data === 0 || data === '' || data === null) {
          qty = this.defaultQty;
          this.prescriptionItem.get('purchaseQty').patchValue(qty);
        }
        this.topChargeItemDescription.qty = data;
        this.calculateCost(data);
      });
    this.prescriptionItem
      .get('duration')
      .valueChanges.pipe(debounceTime(INPUT_DELAY))
      .subscribe(data => {
        this.updateTopDescription();
      });
    this.prescriptionItem
      .get('expiryDate')
      .valueChanges.pipe(
        map(d => {
          d = moment(d, DISPLAY_DATE_FORMAT).format(DISPLAY_DATE_FORMAT);
          const isValid = moment(d, DISPLAY_DATE_FORMAT).isValid();
          return isValid ? d : '';
        })
      )
      .subscribe(data => {
        this.prescriptionItem.get('expiryDate').patchValue(data, { emitEvent: false });
      });
    this.prescriptionItem
      .get('remark')
      .valueChanges.pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.updateRemarkToTopDescription(value);
      });

    this.prescriptionItem
      .get('adjustedTotalPrice')
      .valueChanges.pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged()
      )
      .subscribe(valueInDollars => {
        if (valueInDollars && valueInDollars !== 0) {
          this.patchAdjustedUnitPrice();
        } else {
          this.prescriptionItem.get('adjustedTotalPrice').patchValue(0);
        }
        this.onHandleChargeItemChange.emit({});
      });
  }

  fillItemValues(data) {
    // let drugId = data['drugId']
    let drugId = data;

    if (drugId) {
      let chargeItemDetail = this.chargeItems.filter(x => x.id === drugId)[0];
      this.itemSelected = chargeItemDetail;
      console.log('chargeItemDetail: ', chargeItemDetail);
      
      this.prescriptionItem.get('drugId').patchValue(chargeItemDetail['id']);

      const doseUOM = this.prescriptionItem.get('dose').get('uom');
      const instructionCode = this.prescriptionItem.get('instruction').get('code');
      const dosageInstructionCode = this.prescriptionItem.get('dosageInstruction').get('code');
      const purchaseQty = this.prescriptionItem.get('purchaseQty');
      const unitPrice = this.prescriptionItem.get('unitPrice');
      unitPrice.get('price').patchValue(chargeItemDetail['sellingPrice']['price'] / 100);
      unitPrice.get('taxIncluded').patchValue(chargeItemDetail['sellingPrice']['taxIncluded']);

      if (!this.isService()) {
        if(doseUOM.value ==='' ){doseUOM.patchValue(chargeItemDetail['baseUom'])};
        if(instructionCode.value ==='' ){instructionCode.patchValue(chargeItemDetail['frequencyCode'])};
        if(dosageInstructionCode.value ==='' ){dosageInstructionCode.patchValue(chargeItemDetail['dosageInstructionCode'])};
      this.prescriptionItem.get('duration').patchValue(chargeItemDetail['frequency']);
      }

      if (purchaseQty.value === '' || purchaseQty.value === 0) {
        purchaseQty.patchValue(this.defaultQty);
      }

      this.disableFields();
      this.setMandatoryFields();

      if(!this.isService()){
        this.patchDosageInstruction();
      }

      this.updateDrugToTopDescription(chargeItemDetail);
      this.updateCautionariesToTopDescription(chargeItemDetail);
      this.updateRemarkToTopDescription(this.prescriptionItem.get('remark').value);
      this.getCaseItemPrice(this.prescriptionItem.get('purchaseQty').value);


    }
  }

  calculateCost(qty) {
    console.log('calculating Cost: ', this.prescriptionItem);
    let sellingPrice = this.prescriptionItem.get('unitPrice').get('price').value * 100;
    let oriTotalPrice = this.prescriptionItem.get('oriTotalPrice');
    let adjustedTotalPrice = this.prescriptionItem.get('adjustedTotalPrice');
    let adjustedUnitValue = this.prescriptionItem.get('priceAdjustment').get('adjustedValue').value
      ? this.prescriptionItem.get('priceAdjustment').get('adjustedValue').value
      : 0;
    if (qty && sellingPrice) {
      if (qty && sellingPrice) {
        this.patchAmount(oriTotalPrice, qty, sellingPrice, false);
        this.patchAmount(adjustedTotalPrice, qty, sellingPrice + adjustedUnitValue, true);
        // this.updatePrice.emit(true);
      }
    }
    console.log('calculating Cost: ', this.prescriptionItem);
  }

  adjUnitPriceFallsBelowMinimum(value) {
    console.log('unit price fell below 0.01');
    return value < 1;
  }

  patchAmount(formControl: AbstractControl, qty, price, toDollars: boolean) {
    let amount = qty * +price;
    if (toDollars) {
      amount = Number((amount / 100).toFixed(2));
    }
    console.log('toDollars: ', toDollars);
    formControl.patchValue(amount);
  }

  patchAdjustedUnitPrice() {
    const originalTotalPriceInCents = this.prescriptionItem.get('oriTotalPrice').value;
    const adjustedTotalPriceInCents = this.prescriptionItem.get('adjustedTotalPrice').value * 100;
    const adjustedAmount = this.prescriptionItem.get('priceAdjustment').get('adjustedValue');
    const qty = this.prescriptionItem.get('purchaseQty').value
      ? this.prescriptionItem.get('purchaseQty').value
      : this.defaultQty;
    let adjustedUnitPriceInCents = adjustedTotalPriceInCents / qty;
    const adjustedAmountInCents = (adjustedTotalPriceInCents - originalTotalPriceInCents) / qty;
    if (adjustedAmountInCents) {
      this.prescriptionItem.get('priceAdjustment').get('remark').setValidators([Validators.required]);
      this.prescriptionItem.get('priceAdjustment').get('remark').markAsTouched();
      this.prescriptionItem.get('priceAdjustment').get('remark').updateValueAndValidity();
    } else {
      this.prescriptionItem.get('priceAdjustment').get('remark').setValidators(null);
      this.prescriptionItem.get('priceAdjustment').get('remark').markAsTouched();
      this.prescriptionItem.get('priceAdjustment').get('remark').updateValueAndValidity();
    }

    if (this.adjUnitPriceFallsBelowMinimum(adjustedUnitPriceInCents)) {
      adjustedUnitPriceInCents = 1;
      this.patchAmount(this.prescriptionItem.get('adjustedTotalPrice'), qty, adjustedUnitPriceInCents, true);
      alert('Adj. Unit Price falls below minimum ($0.01). Readjusting Total Amount');
    }
    this.adjustedUnitPriceDisplay = (adjustedUnitPriceInCents / 100).toFixed(2);
    adjustedAmount.patchValue(adjustedAmountInCents);
  }

  calculateAdjustedAmount() {
    let adjustedTotalPrice = this.prescriptionItem.get('adjustedTotalPrice').value * 100;
    let adjustedAmount = this.prescriptionItem.get('priceAdjustment').get('adjustedValue');
    let qty = this.prescriptionItem.get('purchaseQty').value;

    adjustedAmount.patchValue((adjustedTotalPrice - this.prescriptionItem.get('oriTotalPrice').value) / qty);
    this.onHandleChargeItemChange.emit({});
  }

  getCaseItemPrice(qty) {
    let excludedPlans = [];
    if (this.itemSelected || this.prescriptionItem.get('drugId').value) {
      console.log('#0003 Calculating Case Item Price: ');
      const caseItem = {
        chargeDetails: [
          this.caseChargeFormService.buildChargeDetailsItem(
            this.prescriptionItem.get('drugId').value,
            excludedPlans,
            qty
          )
        ]
      };
      this.apiCaseManagerService.getCaseItemPrices(this.store.getCaseId(), caseItem)
      .pipe(debounceTime(INPUT_DELAY),take(1))
      .subscribe(
        data => {
          console.log('#0003 ccase Item Price: ', data);

          var caseItems = data.payload.chargeDetails;
          var caseItem = caseItems.find(data => {
            return data.itemId === this.prescriptionItem.get('drugId').value;
          });
          if (caseItem) {
            // const charge = value.charge.price;
            const price = caseItem.charge.price;
            this.prescriptionItem
              .get('unitPrice')
              .get('price')
              .patchValue(price / 100);
            this.unitPriceDisplay = (price / 100).toFixed(2);
            console.log('#0003 Unit Price display: ', this.unitPriceDisplay);

            this.calculateCost(qty);
          }
        },
        err => {
          this.alertService.error(JSON.stringify(err.error.message));
        }
      );
    }
  }

  getCaseDetails() {
    if (this.store.getCaseId) {
      this.apiCaseManagerService.searchCase(this.store.getCaseId()).subscribe(
        pagedData => {
          console.log('Search Case', pagedData);
          if (pagedData) {
            const { payload } = pagedData;
            this.populateData(payload);
          }
          return pagedData;
        },
        err => {
          this.alertService.error(JSON.stringify(err.error.message));
        }
      );
    }
  }

  getChargeItems() {
    this.store.activeChargeItemList.forEach(element => {
      this.chargeItems.push(element['item']);
    });

    // this.chargeItems = this.store.activeChargeItemList;
  }

  populateDosageInstruction(data) {
    if (data.dosageInstruction) {
      this.currentDosageInstruction = data.dosageInstruction.instruct;
      this.prescriptionItem.get('dosageInstruction').patchValue(data.dosageInstruction);
    } else {
      this.currentDosageInstruction = '';
      this.prescriptionItem
        .get('dosageInstruction')
        .get('code')
        .patchValue('');
      this.prescriptionItem
        .get('dosageInstruction')
        .get('instruct')
        .patchValue('');
    }
  }

  patchDosageInstruction() {
    const code = this.prescriptionItem.get('dosageInstruction').get('code');
    const instruction = this.prescriptionItem.get('dosageInstruction').get('instruct');
    const doseQty = this.prescriptionItem.get('dose').get('quantity');

    if(instruction.value===''){
      this.getDosageInstruction(code.value);
    }else{
      if (instruction.value.includes('#')) {
        this.setDosageValidators();
        const instruct = doseQty.value
          ? instruction.value.replace('#', doseQty.value)
          : this.currentDosageInstruction;
        this.updateDosageInstructionToTopDescription(instruct);
      }else{
        this.disableDosageQuantity();
      }
    }

  }

  disableDosageQuantity(){
    const doseQty = this.prescriptionItem.get('dose').get('quantity');
    doseQty.setValidators(null);
    doseQty.markAsTouched();
    doseQty.updateValueAndValidity();
    doseQty.reset();
    doseQty.disable();
  } 

  getDosageInstruction(code){
    const instruction = this.prescriptionItem.get('dosageInstruction').get('instruct');
    if(instruction.value === '' || instruction.value === undefined){
         const dosageInstruction = this.store.getDosageInstructionByCode(code);
         if(dosageInstruction){
           instruction.patchValue(dosageInstruction.instruct);
         }
    }
  }

  disableFields() {
    if (this.isService()) {
      const instructionCode = this.prescriptionItem.get('instruction').get('code');
      const doseUom = this.prescriptionItem.get('dose').get('uom');
      const doseQty = this.prescriptionItem.get('dose').get('quantity');
      const duration =  this.prescriptionItem.get('duration');
      const dosageInstruction = this.prescriptionItem.get('dosageInstruction');
      this.resetAndDisable(dosageInstruction);
      this.resetAndDisable(instructionCode);
      this.resetAndDisable(doseUom);
      this.resetAndDisable(doseQty);
      this.resetAndDisable(duration);
    }
  }

  resetAndDisable(control: AbstractControl){
    control.reset();
    control.disable();
  }

  isService() {
    if (this.itemSelected) {
      console.log('isservice: ', this.itemSelected.itemType);
      const itemType = this.itemSelected.itemType;
      if (itemType === 'LABORATORY' || itemType === 'SERVICE'  || itemType === 'VACCINATION') {
        return true;
      } else {
        return false;
      }
    }
  }

  setMandatoryFields() {
    if (!this.isService()) {
      console.log('set mandatory');
      this.prescriptionItem
        .get('instruction')
        .get('code')
        .setValidators([Validators.required]);
      this.prescriptionItem
        .get('instruction')
        .get('code')
        .markAsTouched();
      this.prescriptionItem
        .get('instruction')
        .get('code')
        .updateValueAndValidity();
      this.prescriptionItem.get('purchaseQty').setValidators([Validators.required, Validators.min(1)]);
      this.prescriptionItem.get('purchaseQty').markAsTouched();
      this.prescriptionItem.get('purchaseQty').updateValueAndValidity();

      if (
        this.prescriptionItem
          .get('dosageInstruction')
          .get('instruct')
          .value.includes('#')
      ) {
        this.setDosageValidators();
      } else {
        this.prescriptionItem
          .get('dose')
          .get('quantity')
          .disable();
      }

      this.prescriptionItem.get('batchNumber').setValidators([Validators.required]);
      this.prescriptionItem.get('batchNumber').updateValueAndValidity({ emitEvent: false });
      this.prescriptionItem.get('batchNumber').markAsTouched();

      this.prescriptionItem
        .get('expiryDate')
        .setValidators([Validators.required, Validators.pattern('((0[1-9]|[12]\\d|3[01])-(0[1-9]|1[0-2])-\\d{4})')]);
      this.prescriptionItem.get('expiryDate').markAsTouched();
      this.prescriptionItem.get('expiryDate').updateValueAndValidity();
    }
  }

  setDosageValidators() {
    const uomInput = this.prescriptionItem
      .get('dose')
      .get('uom')
      .value.toLocaleLowerCase();

    const uom: Uom = this.store.uoms.find(item => item.uom.toLowerCase() === uomInput) || new Uom();
    this.dosageMin = uom.multiply;

    this.prescriptionItem
      .get('dose')
      .get('quantity')
      .enable();
    this.prescriptionItem
      .get('dose')
      .get('quantity')
      .setValidators([Validators.required, Validators.min(this.dosageMin), mulitplierValidator(this.dosageMin)]);
    this.prescriptionItem
      .get('dose')
      .get('quantity')
      .markAsTouched();
    this.prescriptionItem
      .get('dose')
      .get('quantity')
      .updateValueAndValidity();
  }

  populateData(data: Case) {
    this.case = data;
    this.plansInSO = this.case.coverages;
    // if (!(this.prescriptionItem.get('salesItemCode') && this.prescriptionItem.get('salesItemCode').value)) {
    //   let planIds = []
    //   this.plansInSO.forEach(element => {
    //     planIds.push(element['planId'])
    //   });
    //   this.prescriptionItem.get('excludedCoveragePlanIds').patchValue(planIds)
    // }
    this.setPlans();
  }

  setPlans() {
    let plans = this.prescriptionItem.get('excludedCoveragePlanIds').value;
    let selectedItems = [];
    this.plansInSO.forEach(element => {
      if (!plans || (plans && plans.indexOf(element['planId']) === -1)) {
        selectedItems.push(element);
      }
    });
    console.log('selected plans ', selectedItems);
    this.selectedItems = selectedItems;
  }

  updateDrugToTopDescription(chargeItem) {
    this.topChargeItemDescription.charge = chargeItem['name'];
    this.topChargeItemDescription.uom = chargeItem['baseUom'];
    this.updateTopDescription();
  }

  // updateDosageInstructionToTopDescription(chargeItem) {
  //   this.topChargeItemDescription.sig = chargeItem['indications'];
  //   this.updateTopDescription();
  // }

  updateDosageInstructionToTopDescription(dosageInstruction) {
    if (dosageInstruction) {
      this.topChargeItemDescription.dosageInstruction = dosageInstruction + '/';
    } else {
      this.topChargeItemDescription.dosageInstruction = '';
    }
    this.updateTopDescription();
  }

  updateCautionariesToTopDescription(chargeItem) {
    this.topChargeItemDescription.cautionary = chargeItem['precautionaryInstructions'];
    this.updateTopDescription();
  }

  updateInstructionToTopDescription(chargeItem) {
    let item = this.instructions.filter(x => x.code === chargeItem.code);
    if (item[0]) {
      this.topChargeItemDescription.sig = item[0]['instruct'];
      this.updateTopDescription();
    }
  }

  updateRemarkToTopDescription(remark) {
    this.topChargeItemDescription.remarks = remark;
    this.updateTopDescription();
  }

  updateTopDescription() {
    console.log('emit touch');
    this.onTopChargeItemDescriptionChanged.emit(this.topChargeItemDescription);
  }

  toggleDiscount() {
    this.isDiscountShown = !this.isDiscountShown;
  }

  onFilterInputChanged() {
    try {
      this.codesTypeahead
        .pipe(
          filter(input => {
            if (input.trim().length === 0) {
              this.chargeItems = this.store.activeChargeItemList;
              return false;
            } else {
              return true;
            }
          }),
          distinctUntilChanged((a, b) => {
            return a === b;
          }),
          tap(() => (this.loading = true)),
          debounceTime(200),
          switchMap((term: string) => {
            return this.apiCmsManagementService.searchListItemByKeyWord(term);
          })
        )
        // .takeUntil(this.componentDestroyed)
        .subscribe(
          data => {
            this.loading = false;
            if (data) {
              this.chargeItems = [];
              data.payload.forEach(element => {
                this.chargeItems.push(element['item']);
              });
              // this.chargeItems = data.payload;
            }
          },
          err => {
            this.loading = false;
            this.alertService.error(JSON.stringify(err.error.message));
          }
        );
    } catch (err) {
      console.log('Search Diagnosis Error', err);
    }
  }
}
