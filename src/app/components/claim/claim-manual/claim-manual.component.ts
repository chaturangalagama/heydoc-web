import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { AlertService } from './../../../services/alert.service';
import * as moment from 'moment';
import { ApiPatientVisitService } from '../../../services/api-patient-visit.service';
import { DISPLAY_DATE_FORMAT, DB_FULL_DATE_FORMAT } from './../../../constants/app.constants';
import { StoreService } from './../../../services/store.service';
import { SelectItemOptions } from '../../../objects/SelectItemOptions';
import { Subject } from 'rxjs';
import { Diagnosis } from '../../../objects/response/Diagnosis';
import { distinctUntilChanged, debounceTime, switchMap, tap } from 'rxjs/operators';
import { ApiCmsManagementService } from './../../../services/api-cms-management.service';
import { Clinic } from '../../../objects/response/Clinic';
import { Page } from '../../../model/page';

@Component({
  selector: 'app-claim-manual',
  templateUrl: './claim-manual.component.html',
  styleUrls: ['./claim-manual.component.scss']
})
export class ClaimManualComponent implements OnInit {
  @ViewChild('myTable') table: any;
  @Input() tabtype: any;
  columns: any[] = [];
  rows: any[] = [];
  statusList = ['SUBMITTED', 'PENDING', 'REJECTED', 'APPEALED', 'APPROVED', 'PAID', 'FAILED'];
  searchStatusList = ['ALL', 'SUBMITTED', 'PENDING', 'REJECTED_PERMANENT', 'REJECTED', 'APPEALED', 'APPROVED', 'PAID', 'FAILED'];
  doctorList: any[] = [];
  clinics: Array<Clinic>;
  showEdit = false;
  editFormGroup: FormGroup;
  searchFormGroup: FormGroup;
  codes: Array<SelectItemOptions<Diagnosis>> = [];
  codesTypeahead = new Subject<string>();
  diagnosisLoading = false;
  // page = new Page();
  medicalCoverages = ['CORPORATE', 'INSURANCE'];

  constructor(
    private fb: FormBuilder,
    private alertService: AlertService,
    private store: StoreService,
    private apiPatientVisitService: ApiPatientVisitService,
    private apiCmsManagementService: ApiCmsManagementService
  ) {
    // this.page.pageNumber = 0;
    // this.page.size = 10;
  }

  ngOnInit() {
    this.newEditFormGroup();
    this.newSearchFormGroup();
    this.populateData();
    this.onFilterInputChanged();
    this.store.getIsStoreReady().subscribe(val => {
      if (val.isLoaded && !val.isReseting) {
        this.populateData();
        this.onSearchClaimClicked({ offset: 0 });
      }
    });
  }

  private populateData() {
    this.doctorList = this.store.getDoctors();
    this.clinics = this.store.getClinicList();
    const clinicId = this.store.getClinic() && this.store.getClinic().id;
    this.searchFormGroup.get('clinicId').patchValue(clinicId && [clinicId]);
  }

  newSearchFormGroup() {
    this.searchFormGroup = this.fb.group({
      medicalCoverage: this.medicalCoverages[0],
      nric: '',
      startDate: [moment().subtract(1, 'days').format(DISPLAY_DATE_FORMAT), Validators.required],
      endDate: [moment().format(DISPLAY_DATE_FORMAT), Validators.required],
      clinicId: [],
      status: this.searchStatusList[0]
    });
  }

  onSearchClaimClicked(pageInfo) {
    // this.page.pageNumber = pageInfo.offset;
    const startDateStr = moment(this.searchFormGroup.get('startDate').value, 'DD-MM-YYYY').format('DD-MM-YYYY');
    const endDateStr = moment(this.searchFormGroup.get('endDate').value, 'DD-MM-YYYY').format('DD-MM-YYYY');
    const status = this.searchFormGroup.get('status').value;
    const medicalCoverage = this.searchFormGroup.get('medicalCoverage').value;
    const nric = this.searchFormGroup.get('nric').value;
    let clinicIds = [];
    if (!this.searchFormGroup.get('clinicId').value || this.searchFormGroup.get('clinicId').value.length === 0)
      clinicIds.push(this.store.getClinic().id);
    else
      clinicIds = this.searchFormGroup.get('clinicId').value;

    this.apiPatientVisitService.listManualClaimsByMultipleClinlicsByDate(clinicIds, medicalCoverage, status, startDateStr, endDateStr, nric, null).subscribe(
      response => {
        // const response = JSON.parse('{"statusCode":"S0000","timestamp":"03-10-2018 06:45:34","message":"Success","totalPages":2,"pageNumber":2,"totalElements":15, "payload":[{"claim":{"manuallyUpdated":true, "claimId":"0000000001","submissionDateTime":[2018,10,3,18,45,34,842000000],"attendingDoctorId":"00000001","claimDoctorId":"5b55aab70550de0021096e9c","payersNric":"G00001","payersName":"G00002","diagnosisCodes":["S01","S02"],"consultationAmt":100,"medicationAmt":50,"medicalTestAmt":20,"otherAmt":10,"claimExpectedAmt":180,"remark":"Nothing is there to be commented","claimStatus":"APPROVED","claimResult":{"referenceNumber":"9000001","resultDateTime":[2018,10,3,18,45,34,847000000],"amount":150,"statusCode":"SUCCESS","remark":"Ofcos its success"},"appealRejections":[]},"patientId":"P00001","visitId":"V0001","billNumber":"00001","patientName":"Patient Name","userId":{"idType":"NRIC","number":"P00001"}},{"claim":{"manuallyUpdated":false, "claimId":"0000000002","submissionDateTime":[2018,6,15,18,45,34,842000000],"attendingDoctorId":"00000002","claimDoctorId":"00000002","payersNric":"G00014","payersName":"G00015","diagnosisCodes":["S01","S02","S19","S12"],"consultationAmt":100,"medicationAmt":50,"medicalTestAmt":20,"otherAmt":10,"claimExpectedAmt":180,"remark":"Nothing is there to be commented","claimStatus":"APPROVED","claimResult":{"referenceNumber":"9000001","resultDateTime":[2018,10,3,18,45,34,847000000],"amount":150,"statusCode":"SUCCESS","remark":"Ofcos its success"},"appealRejections":[]},"patientId":"P00001","visitId":"V0001","billNumber":"00001","patientName":"Patient Name","userId":{"idType":"NRIC","number":"P00001"}},{"claim":{"manuallyUpdated":false, "claimId":"0000000003","submissionDateTime":[2018,9,11,18,45,34,842000000],"attendingDoctorId":"00000003","claimDoctorId":"00000003","payersNric":"G00005","payersName":"G00007","diagnosisCodes":["S01","S02","S55"],"consultationAmt":100,"medicationAmt":50,"medicalTestAmt":20,"otherAmt":10,"claimExpectedAmt":180,"remark":"Nothing is there to be commented","claimStatus":"APPROVED","claimResult":{"referenceNumber":"9000001","resultDateTime":[2018,10,3,18,45,34,847000000],"amount":150,"statusCode":"SUCCESS","remark":"Ofcos its success"},"appealRejections":[]},"patientId":"P00001","visitId":"V0001","billNumber":"00001","patientName":"Patient Name","userId":{"idType":"NRIC","number":"P00001"}}]}');
        this.rows = this.mapPayloadToRows(response.payload);
        // this.page.pageNumber = response['pageNumber'];
        // this.page.totalPages = response['totalPages'];
        // this.page.totalElements = response['totalElements'];
        this.rows = this.rows.sort((a, b) => {
          const date1 = moment(a.billDate, DISPLAY_DATE_FORMAT);
          const date2 = moment(b.billDate, DISPLAY_DATE_FORMAT);
          if (date1.isBefore(date2)) return -1;
          if (date1.isAfter(date2)) return 1;
          return 0; // equal
        });
      },
      err => {
        this.alertService.error(JSON.stringify(err));
      }
    );
  }

  mapPayloadToRows(payload: any[]) {
    const arr = payload.filter(function (res) {
      if (!res.claim.manuallyUpdated)
        return false;
      return true;
    }, this.tabtype).map(res => {
      const doctor = this.store.findDoctorById(res.claim.claimDoctorId);
      return {
        claimId: res.claim.claimId,
        billDate: res.billDate ? moment(res.billDate, DB_FULL_DATE_FORMAT).format(DISPLAY_DATE_FORMAT) : 'N/A',
        submitDate: res.claim.submissionDateTime ? moment({ y: res.claim.submissionDateTime[0], M: res.claim.submissionDateTime[1] - 1, d: res.claim.submissionDateTime[2] }).format(DISPLAY_DATE_FORMAT) : 'N/A',
        HEcode: res.clinicHeCode, //clinlic.heCode || 'N/A',
        hospitalCode: res.hospitalCode,
        clinic: this.store.getClinicList().find(clinic => clinic.id === res.clinicId).clinicCode, // clinic: clinlic.clinicCode,
        patientName: res.patientsName,
        patientNric: res.patientsNric,
        payerName: res.payersName,
        payerNric: res.payersNric,
        documentName: res.documentName,
        drCode: res.claim.claimDoctorId,
        doctorName: doctor ? doctor.displayName + ' (' + (doctor.mcr ? doctor.mcr : '---') + ')' : 'N/A',
        // referNo: res.claim.claimId,
        diagnosisCode: res.diagnosisCodes,
        conAmt: res.claim.consultationAmt / 100,
        drugAmt: res.claim.medicationAmt / 100,
        labAmt: res.claim.medicalTestAmt / 100,
        otherAmt: res.claim.otherAmt / 100,
        totAmt: res.totalAmount / 100,
        receiptNo: res.billReceiptId,
        remarks: res.claim.remark,
        expectedClaimAmt: res.claim.claimExpectedAmt / 100,
        claimedAmt: res.claimedAmount / 100,
        claimRefNo: res.claim.claimRefNo,
        status: res.claim.claimStatus,
      };
    });
    return arr;
  }

  // Edit Form Section
  newEditFormGroup() {
    this.editFormGroup = this.fb.group({
      claimId: [{ value: '', disabled: true }, Validators.required],
      date: { value: '', disabled: true },
      HEcode: { value: '', disabled: false },
      hospitalCode: { value: '', disabled: false },
      clinic: { value: '', disabled: true },
      patientName: { value: '', disabled: true },
      patientNric: { value: '', disabled: true },
      payerName: { value: '', disabled: false },
      payerNric: { value: '', disabled: false },
      doctor: { value: '', disabled: false },
      // referNo: { value: '', disabled: true },
      diagnosisCode: { value: '', disabled: false },
      receiptNo: { value: '', disabled: true },
      conAmt: { value: '', disabled: true },
      drugAmt: { value: '', disabled: true },
      labAmt: { value: '', disabled: true },
      otherAmt: { value: '', disabled: true },
      expectedClaimAmt: { value: '', disabled: false },
      remarks: { value: '', disabled: false },
      claimedAmt: { value: '', disabled: false },
      claimRefNo: { value: '', disabled: false },
      status: { value: '', disabled: false },
    });
  }

  onEditUserClicked(row) {
    this.showEdit = true;
    this.updateEditForm(row);
    window.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  }

  updateEditForm(row: any) {
    this.editFormGroup.patchValue({
      claimId: row.claimId,
      date: row.billDate,
      HEcode: row.HEcode,
      hospitalCode: row.hospitalCode,
      clinic: row.clinic,
      patientName: row.patientName,
      patientNric: row.patientNric,
      payerName: row.payerName,
      payerNric: row.payerNric,
      doctor: row.drCode,
      // referNo: row.referNo,
      receiptNo: row.receiptNo,
      diagnosisCode: row.diagnosisCode,
      conAmt: row.conAmt,
      drugAmt: row.drugAmt,
      labAmt: row.labAmt,
      otherAmt: row.otherAmt,
      expectedClaimAmt: row.expectedClaimAmt,
      remarks: row.remarks,
      claimedAmt: row.claimedAmt,
      claimRefNo: row.claimRefNo,
      status: row.status,
    });
  }

  resetEditFormGroup() {
    this.showEdit = false;
    this.editFormGroup.reset();
    this.newEditFormGroup();
  }

  onChargePatientClicked(row: any) {
    const claimId = row.claimId;
    if (!claimId && claimId === '') {
      alert('Please select a recored before proceeding!'); return;
    }
    this.apiPatientVisitService.rejectClaimManual(claimId).subscribe(
      res => {
        alert('Claim is rejected');
        this.resetEditFormGroup();
        this.onSearchClaimClicked({ offset: 0 });
      },
      err => {
        this.alertService.error(JSON.stringify(err));
      }
    );
  }

  onSaveClicked() {
    console.log('onSaveClicked');
    const claim = this.mapFormGroupToClaimSave(this.editFormGroup);
    const claimId = this.editFormGroup.get('claimId').value;
    if (!claimId && claimId === '') {
      alert('Please select a recored before save!');
      return;
    }
    this.apiPatientVisitService.saveClaimManual(claimId, claim).subscribe(
      res => {
        alert('Claim is updated');
        this.resetEditFormGroup();
        this.onSearchClaimClicked({ offset: 0 });
      },
      err => {
        this.alertService.error(JSON.stringify(err));
      }
    );
  }

  mapFormGroupToClaimSave(formGroup: FormGroup): ClaimSave {
    return new ClaimSave(
      formGroup.get('doctor').value,
      formGroup.get('payerNric').value,
      formGroup.get('payerName').value,
      formGroup.get('diagnosisCode').value,
      formGroup.get('HEcode').value,
      formGroup.get('hospitalCode').value,
      formGroup.get('expectedClaimAmt').value * 100,
      formGroup.get('remarks').value,
      formGroup.get('claimedAmt').value * 100,
      formGroup.get('claimRefNo').value,
      formGroup.get('status').value
    );
  }

  onFilterInputChanged() {
    try {
      this.codesTypeahead.pipe(
        distinctUntilChanged((a, b) => b.trim().length === 0),
        debounceTime(400),
        tap(() => (this.diagnosisLoading = true)),
        switchMap((term: string) => {
          return this.apiCmsManagementService.searchDiagnosis(term);
        })
      ).subscribe(
        data => {
          this.diagnosisLoading = false;
          if (data)
            this.codes = data.payload;
        },
        err => {
          this.diagnosisLoading = false;
          if (err && err.error && err.error.message)
            this.alertService.error(JSON.stringify(err.error.message));
        }
      );
    } catch (err) {
      console.log('Search Diagnosis Error', err);
    }
  }

  getRowClass(row) {
    return {
      'is-align-top': true
    };
  }
}

class ClaimSave {
  claimDoctorId: string;
  payersNric: string;
  payersName: string;
  diagnosisCodes: string[];
  clinicHeCode: string;
  hospitalCode: string;
  expectedClaimAmount: number;
  claimRemarks: string;
  claimedAmount: number;
  claimRefNo: string;
  claimStatus: string;

  constructor(
    claimDoctorId: string,
    payersNric: string,
    payersName: string,
    diagnosisCodes: string[],
    clinicHeCode: string,
    hospitalCode: string,
    expectedClaimAmount: number,
    claimRemarks: string,
    claimedAmount: number,
    claimRefNo: string,
    claimStatus: string,

  ) {
    this.claimDoctorId = claimDoctorId;
    this.payersNric = payersNric;
    this.payersName = payersName;
    this.diagnosisCodes = diagnosisCodes;
    this.clinicHeCode = clinicHeCode;
    this.hospitalCode = hospitalCode;
    this.expectedClaimAmount = expectedClaimAmount;
    this.claimRemarks = claimRemarks;
    this.claimedAmount = claimedAmount;
    this.claimRefNo = claimRefNo;
    this.claimStatus = claimStatus;
  }
}
