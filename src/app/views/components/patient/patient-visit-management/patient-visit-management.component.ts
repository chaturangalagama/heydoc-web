import { DialogService } from './../../../../services/dialog.service';
import { CaseChargeFormService } from './../../../../services/case-charge-form.service';
import { VISIT_MANAGEMENT_TABS, INPUT_DELAY } from './../../../../constants/app.constants';

// General Libraries
import { Subject, forkJoin } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged, takeUntil,take } from 'rxjs/operators';
import { FormGroup, FormArray, FormBuilder } from '@angular/forms';
import { Component, OnInit, Output, EventEmitter, OnDestroy, HostListener } from '@angular/core';
import { timer, Observable } from 'rxjs';
import * as moment from 'moment';

// Service
import { PatientService } from './../../../../services/patient.service';
import { UtilsService } from './../../../../services/utils.service';
import { MedicalCoverageFormService } from './../../../../services/medical-coverage-form.service';
import { ApiPatientVisitService } from '../../../../services/api-patient-visit.service';
import { AlertService } from './../../../../services/alert.service';
import { ConsultationFormService } from './../../../../services/consultation-form.service';
import { StoreService } from './../../../../services/store.service';
import { TempStoreService } from '../../../../services/temp-store.service';
import { ApiPatientInfoService } from './../../../../services/api-patient-info.service';
import { PaymentService } from './../../../../services/payment.service';
import { NgxPermissionsService } from 'ngx-permissions';

// Objects
import { MedicalCoverageResponse } from './../../../../objects/response/MedicalCoverageResponse';
import { MedicalCoverageSelected } from './../../../../objects/MedicalCoverage';
import { MedicalAlertResponse } from './../../../../objects/response/MedicalAlertResponse';
import { Allergy } from './../../../../objects/response/Allergy';
import { MedicalCertificateItemsArrayComponent } from './../../../../components/consultation/consultation-medical-certificate/medical-certificate-items-array.component';

// Constants
import { DISPLAY_DATE_FORMAT, PATIENT_INFO_KEYS } from '../../../../constants/app.constants';
import { ApiCaseManagerService } from '../../../../services/api-case-manager.service';

@Component({
  selector: 'app-patient-visit-management',
  templateUrl: './patient-visit-management.component.html',
  styleUrls: ['./patient-visit-management.component.scss']
})
export class PatientVisitManagementComponent implements OnInit, OnDestroy {
  // Panel Controls, Variables and Booleans
  @Output() isQueueHidden = true;
  @Output() reloadPatient = new EventEmitter<any>();

  previousUrl: string;
  private componentDestroyed: Subject<void> = new Subject();

  // Tab Variable and Control Options
  needRefresh = new Subject<boolean>();
  selectedTabIndex;
  showSidePane = false;
  isSaving;
  showSaveDraftButton;
  @Output() tabSelected = new EventEmitter<boolean>();

  // Alerts Panel
  alerts: Array<Allergy>;
  medicalAlerts: Array<MedicalAlertResponse>;
  visitManagementFormGroup: FormGroup;

  // Patient Information
  patientInfo; // Array of Patient Information

  // Consultation Tab
  consultation;

  // Documents Tab
  documentsFormGroup: FormGroup;
  visitDocuments;
  patientDocuments;

  drugErrors = [];

  // Medical Coverage Tab
  selectedPlans: FormArray;
  attachedMedicalCoverages: FormArray;
  coverages: MedicalCoverageResponse;
  policyHolderInfo: FormArray;
  selectedCoverageType = new Set();

  // Charge Panel
  chargeFormGroup: FormGroup;

  multipleAccessKey: string;
  currentUserAccessing: Set<string>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private paymentService: PaymentService,
    private apiPatientInfoService: ApiPatientInfoService,
    private apiPatientVisitService: ApiPatientVisitService,
    private apiCaseManagerService: ApiCaseManagerService,
    private consultationFormService: ConsultationFormService,
    private caseChargeFormService: CaseChargeFormService,
    private patientService: PatientService,
    private utilsService: UtilsService,
    private permissionsService: NgxPermissionsService,
    private store: StoreService,
    private tempStore: TempStoreService,
    private fb: FormBuilder,
    private medicalCoverageFormService: MedicalCoverageFormService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.multipleAccessKey = `Dispensing_${this.store.getPatientVisitRegistryId()}`;
    this.currentUserAccessing = new Set();
  }

  ngOnInit() {
    if (!this.store.getPatientId()) {
      alert('No Patient Details');
      this.router.navigate(['pages/patient/list']);
      return;
    }

    this.checkMultipleUserAccess();

    // Reset form
    this.createForm();
    this.initialisePatient();

    // Upon Patient Visit ID Refresh
    this.store
      .getPatientVisitIdRefresh()
      .pipe(
        debounceTime(50),
        takeUntil(this.componentDestroyed),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(id => {
        if (id.length > 0) {
          // this.initialisePatient();
          console.log("#0009 visit id refresh: ",id);
          // this.resetForm();
          // this.createForm();
          this.initialisePatient();
        }
      });

    // Configure 2-pane or 3-pane display
    this.activatedRoute.queryParams
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        debounceTime(INPUT_DELAY)
      )
      .subscribe(params => {
        this.selectedTabIndex = params['tabIndex'] || 0;
        this.showSaveDraft();
        this.showSidePane = params['showSidePane'] === 'true' ? true : false; // 'Consultation' Tab selected?
      });

    // this.modifySubPaneDivClasses() 

    // Custom CSS modification
    var body = document.getElementsByTagName('body')[0];
    body.classList.add('hideOverflow');

    this.visitManagementFormGroup.get('consultationFormGroup').get('dispatchItemEntities').valueChanges.pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))).subscribe( value =>{
      console.log("#0009 VSM ----> Dispatch: ", value);
    });

    this.visitManagementFormGroup.get('consultationFormGroup').get('diagnosisIds').valueChanges.pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))).subscribe( value =>{
      console.log("#0009 VSM ----> Diagnosis: ", value);
    });
  }

  modifySubPaneDivClasses() {
    var conSubPane = document.querySelector('#consultation-subpane');
    var conSubPaneClass = conSubPane.classList;
    if (this.showSidePane && conSubPaneClass) {
      if (conSubPaneClass.contains('col-12')) {
        conSubPaneClass.remove('col-12');
        conSubPaneClass.add('col-8');
      }
    } else {
      conSubPaneClass.remove('col-8');
      conSubPaneClass.add('col-12');
    }
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    var body = document.getElementsByTagName('body')[0];
    body.classList.remove('hideOverflow');

    this.componentDestroyed.next();
    this.componentDestroyed.unsubscribe();
  }

  resetForm() {
    this.consultationFormService.resetForm();
    this.caseChargeFormService.resetForm();
    this.paymentService.resetVisitCoverageArray();
    this.paymentService.resetChargeFormGroup();
    // this.createForm();
    // this.initialisePatient();
  }

  createForm() {
    // Initialise Medical Coverage FormArrays for Sub-Component Medical Coverage
    this.policyHolderInfo = this.fb.array([]);
    this.selectedPlans = this.fb.array([]);
    this.attachedMedicalCoverages = this.fb.array([]);

    // Initalise FormGroups
    this.visitManagementFormGroup = this.fb.group({
      // Profile Tab
      profileFormGroup: this.fb.group({
        basicInfoFormGroup: this.patientService.createPatientBasicInfoFormGroup(),
        companyInfoFormGroup: this.patientService.createPatientCompanyInfoFormGroup(),
        emergencyContactFormGroup: this.patientService.createPatientEmergencyContactFormGroup()
      }),

      // Vital Tab
      vitalFormGroup: this.consultationFormService.generateVitalForm(),

      // Consultation Tab
      consultationFormGroup: this.consultationFormService.createConsultationFormGroup(),

      // Documents Tab
      documentsFormGroup: this.fb.group({
        filter: '',
        dateRange: '',
        documentsArray: this.fb.array([]),
        newDocumentsArray: this.fb.array([])
      }),

      // Others Tab
      chargeFormGroup: this.paymentService.createChargeFormGroupDua(),
      historyFormGroup: this.patientService.createPatientDetailHistoryFormGroup()
    });
  }

  // onFirstChargeItemDetailsAdded(event: FormArray) {
  //   const consultationFormGroup = this.visitManagementFormGroup.get('consultationFormGroup') as FormGroup;
  //   console.log('consultationFormGroup: ', consultationFormGroup);
  // }

  initialisePatient() {
    // Initialise Patient Data to be passed down to some sub-components
    const source = timer(500);
    const subscribe = source.subscribe(val => {

      if (this.store.getUserId()) {
       
        this.apiPatientInfoService
          .searchBy('systemuserid', this.store.getPatientId())
          .pipe(
            distinctUntilChanged(),
            debounceTime(INPUT_DELAY)
          )
          .subscribe(
            res => {
              
              this.patientInfo = this.updatePatient(res.payload);
              this.getMedicalCoverages();
              this.getAlertsAndAllergies();
              this.getDocumentsByPatient();
              this.updateProfileTab();
            },
            err => {
              this.alertService.error(JSON.stringify(err));
              this.store.setPatientId('');
              this.router.navigate(['pages/patient/detail']);
            }
          );
      }
    });
  }

  // Get Alerts and Allergies
  getAlertsAndAllergies() {
    // Set Allergies
    this.alerts = this.patientInfo.allergies;

    // Set Medical Alerts
    this.medicalAlerts = Array<MedicalAlertResponse>();
    this.apiPatientInfoService
      .listAlert(this.store.getPatientId())
      .pipe(
        distinctUntilChanged(),
        debounceTime(INPUT_DELAY)
      )
      .subscribe(
        res => {
          if (res.payload) {
            const alertDetails = <Array<MedicalAlertResponse>>res.payload.details;
            const tempAlertArray = Array<MedicalAlertResponse>();
            alertDetails.forEach(alert => {
              if (alert.alertType !== 'ALLERGY') {
                tempAlertArray.push(alert);
              }
            });
            this.medicalAlerts = tempAlertArray;
            console.log('MEDICAL ALERTS: ', this.medicalAlerts);
          }
        },
        err => {
          this.alertService.error(JSON.stringify(err.error.message));
        }
      );
  }

  // Get Documents By Patient
  getDocumentsByPatient(startDate = '', endDate = '') {
    const documentsArray = this.visitManagementFormGroup.get('documentsFormGroup').get('documentsArray') as FormArray;

    while (documentsArray.length) {
      documentsArray.removeAt(0);
    }

    const patientId = this.store.getPatientId();
    if (!patientId) {
      return;
    }

    if (startDate === '') {
      startDate = moment()
        .subtract(6, 'months')
        .format(DISPLAY_DATE_FORMAT);
    }
    if (endDate === '') {
      endDate = moment().format(DISPLAY_DATE_FORMAT);
    }

    this.apiPatientVisitService
      .listAllFiles(patientId, startDate, endDate)
      .pipe(
        distinctUntilChanged(),
        debounceTime(INPUT_DELAY)
      )
      .subscribe(
        res => {
          const payload = res.payload;
          const flattenPayload = payload.reduce((documents, documentGroup) => {
            if(documentGroup.fileMetaData){
              documentGroup.fileMetaData.forEach(file => {
                file.localDate = documentGroup.localDate;
                file.listType = documentGroup.listType;
                file.patientVisitId = documentGroup.patientVisitId || '';
              });
              documents = documents.concat(documentGroup.fileMetaData);
            }
            return documents;
          }, []);
          const allDocuments = flattenPayload.reduce((allDocuments, documents) => allDocuments.concat(documents), []);
          this.patientDocuments = allDocuments;
          this.updateDocumentList('patient');
          this.subscribeOnInit();
        },
        err => console.log(err)
      );
  }

  // Get Medical Coverages
  getMedicalCoverages() {
    this.apiPatientInfoService
      .searchAssignedPoliciesByUserId(this.patientInfo['userId'])
      .pipe(
        distinctUntilChanged(),
        debounceTime(INPUT_DELAY)
      )
      .subscribe(
        resp => {
          if (resp.payload) {
            this.coverages = new MedicalCoverageResponse(
              resp.payload.INSURANCE,
              resp.payload.CORPORATE,
              resp.payload.CHAS,
              resp.payload.MEDISAVE
            );
            this.populateData(this.coverages);
          }
        },
        err => this.alertService.error(JSON.stringify(err))
      );

    this.apiCaseManagerService
      .searchCase(this.store.getCaseId())
      .pipe(
        distinctUntilChanged(),
        debounceTime(INPUT_DELAY)
      )
      .subscribe(
        res => {
          console.log('res MC: ', res.payload);
          res.payload.coverages.forEach(selectedPlan => {
            const id = selectedPlan.planId;
            const coverage = this.store
              .getMedicalCoverages()
              .find(coverage => coverage.coveragePlans.some(plans => plans.id === id));
            if (coverage) {
              this.attachedMedicalCoverages.push(
                this.fb.group({
                  medicalCoverageId: coverage.id,
                  planId: id
                })
              );
            }
          });
        },
        err => {
          this.alertService.error(JSON.stringify(err));
        }
      );
  }

  // getVisitDetail() {
  //   this.apiPatientVisitService.consultationSearchByPatientVisitId(this.store.getPatientVisitRegistryId())
  //   .pipe(distinctUntilChanged(), debounceTime(INPUT_DELAY))
  //   .subscribe(
  //     res => {
  //       if (!res.payload) {
  //         return;
  //       }

  //       if (res.payload.visitStatus === 'CONSULT') {
  //         //patch data for consultation save
  //         const consultation = res.payload;
  //         this.patchValueToConsultationFormGroup(consultation);
  //       }
  //     },
  //     err => {
  //       this.alertService.error(JSON.stringify(err));
  //     }
  //   );
  // }

  subscribeOnInit() {
    this.visitManagementFormGroup
      .get('documentsFormGroup')
      .get('filter')
      .valueChanges.pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(values => this.updateDocumentList('patient'));
  }

  updateDocumentList(type: string) {
    const formGroup =
      type === 'visit'
        ? this.visitManagementFormGroup.get('historyDetailFormGroup')
        : this.visitManagementFormGroup.get('documentsFormGroup');
    const documents =
      type === 'visit'
        ? this.visitDocuments.filter(document => document.name.includes(formGroup.get('filter').value))
        : this.patientDocuments.filter(document => document.fileName.includes(formGroup.get('filter').value));
    const documentsArray = formGroup.get('documentsArray') as FormArray;
    while (documentsArray.length) {
      documentsArray.removeAt(0);
    }

    documents.forEach(document => {
      documentsArray.push(
        this.fb.group({
          name: document.name || '',
          date: document.listType === 'VISIT' ? document.localDate || '' : '',
          document: document.fileName,
          description: document.description,
          type: document.type,
          size: document.size,
          listType: document.listType || '',
          patientVisitId: document.patientVisitId || '',

          fileId: document.fileId,
          clinicId: document.clinicId
        })
      );
    });
  }

  userDiscardChanges() {
    return confirm('Your changes have not been saved. \n\n Would you like to discard changes?');
  }

  formIsDirty() {
    return this.visitManagementFormGroup.dirty ? true : false;
  }

  reloadPatientData(event) {
    if (this.formIsDirty()) {
      const discardChanges = this.userDiscardChanges();
      if (discardChanges) {
        // Refresh

        // Do Nothing
        console.log('pa-vi Yes, discard and continue to next patient');
        this.refresh(event);
      } else {
        console.log("pa-vi No, don't discard and stay on same patient");
      }
    } else {
      //Refresh
      console.log('pa-vi form is not dirty, continue to next patient');
      this.refresh(event);
    }
  }

  refresh(event) {
    // Set Patient Id
    if (event.callNext) {
      this.apiPatientVisitService
        .nextPatient(this.store.getClinicId(), this.store.getDoctorId())
        .pipe(
          debounceTime(INPUT_DELAY),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        )
        .subscribe(
          value => {
            if (value) {
              const { payload } = value;
              console.log('CALL NEXT CALLED payload: ', payload);
              event.caseId = payload.caseId;
              event.id = payload.patientId;
              event.status = payload.visitStatus;
              event.visitId = payload.visitId;

              this.setPatientValues(event);
            }
          },
          err => this.alertService.error(JSON.stringify(err))
        );
    } else {
      this.setPatientValues(event);
    }
  }

  setPatientValues(event) {
    console.log('pa-vi event: ', event);
    this.store.setCaseId(event.caseId);
    this.store.setPatientId(event.id);
    this.store.setVisitStatus(event.status);
    this.store.setPatientVisitRegistryId(event.visitId, true);
    // this.initialisePatient();

    // Notify other sub-components that need refresh
    this.needRefresh.next(true);
    this.needRefresh.next(false);
  }

  ///////////////// Update Methods

  // Profile Tab
  updateProfileTab() {
    const pInfo = this.patientInfo;
    const pAdd = pInfo.address;
    const birth = pInfo.dob ? moment(pInfo.dob, DISPLAY_DATE_FORMAT).toDate() : '';

    // Notes: address = { address, postalCode }

    //// Updating Basic Info
    this.visitManagementFormGroup
      .get('profileFormGroup')
      .get('basicInfoFormGroup')
      .patchValue({
        title: pInfo.title, // ------> Patient Particulars
        name: pInfo.name,
        birth,
        gender: pInfo.gender,
        country: pInfo.address.country,
        race: pInfo.race,
        nationality: pInfo.nationality,
        status: pInfo.maritalStatus,
        language: pInfo.preferredLanguage,

        //// Updating Patient Contact Information
        primary: pInfo.contactNumber ? this.formatPhone(pInfo.contactNumber.number) : '',
        secondary: pInfo.secondaryNumber ? this.formatPhone(pInfo.secondaryNumber.number) : '',
        line1: pAdd.address ? pAdd.address.split('\n')[0] : '',
        line2: pAdd.address ? (pAdd.address.split('\n')[1] !== 'undefined' ? pAdd.address.split('\n')[1] : '') : '',
        postCode: pAdd.postalCode,
        email: pInfo.emailAddress,
        communicationMode: pInfo.preferredMethodOfCommunication,
        consentGiven: pInfo.consentGiven
      });

    //// Updating Basic Info : ID Portion
    this.visitManagementFormGroup
      .get('profileFormGroup')
      .get('basicInfoFormGroup')
      .get('fullId')
      .patchValue({
        id: pInfo.userId.number,
        idType: pInfo.userId.idType
      });

    //// Updating Company Information
    this.visitManagementFormGroup
      .get('profileFormGroup')
      .get('companyInfoFormGroup')
      .patchValue({
        company: pInfo.company ? pInfo.company.name : '',
        occupation: pInfo.company ? pInfo.company.occupation : '',
        line1: pInfo.company.address ? pInfo.company.address.split('\n')[0] : '',
        line2: pInfo.company.address ? pInfo.company.address.split('\n')[1] : '',
        postCode: pInfo.company ? pInfo.company.postalCode : ''
      });

    //// Updating Emergency Contact Information
    this.visitManagementFormGroup
      .get('profileFormGroup')
      .get('emergencyContactFormGroup')
      .patchValue({
        name: pInfo.emergencyContactNumber ? pInfo.emergencyContactNumber.name : '',
        contact: pInfo.emergencyContactNumber ? pInfo.emergencyContactNumber.number : '',
        relationship: pInfo.emergencyContactNumber ? pInfo.emergencyContactNumber.relationship : ''
      });

    console.log('Visit Management Form: ', this.visitManagementFormGroup);
    this.visitManagementFormGroup.get('profileFormGroup').disable();
  }

  populateData(payload: MedicalCoverageResponse) {
    this.selectedPlans = this.fb.array([]);
    console.log('PAYLOAD: ', payload);

    for (const key of Object.keys(payload)) {
      if (payload[key].length > 0) {
        payload[key].forEach(element => {
          // Getting policyholder information
          const policyHolder = element.policyHolder;

          this.policyHolderInfo.push(this.medicalCoverageFormService.createCoverageSelectedFB(policyHolder));

          // Create medical coverage to be populated into formgroup
          const medicalCoverageSelected =
            this.store.getPlansByCoverageId(element.policyHolder.medicalCoverageId).length === 0
              ? new MedicalCoverageSelected()
              : <MedicalCoverageSelected>this.store.getPlansByCoverageId(element.policyHolder.medicalCoverageId);

          // Creating plan object to be pushed into Patient's selected plans array
          const plan = this.medicalCoverageFormService.createSelectedPlan(
            false,
            policyHolder,
            '',
            medicalCoverageSelected,
            element.coveragePlan,
            key,
            false
          );

          this.selectedPlans.push(this.fb.group(plan));
        });
      }
    }
    return this.selectedPlans;
  }

  updatePatient(info) {
    return this.utilsService.pick(info, PATIENT_INFO_KEYS);
  }


  // Check Methods before saving through API
  checkPatient() {
    const pInfo = this.visitManagementFormGroup.get('profileFormGroup') as FormGroup;
    const basicDetailInfo = pInfo.get('basicInfoFormGroup') as FormGroup;
    const companyInfo = pInfo.get('companyInfoFormGroup') as FormGroup;
    const emergencyContactInfo = pInfo.get('emergencyContactFormGroup') as FormGroup;

    this.patientInfo = this.patientService.checkBasicDetailInfo(this.patientInfo, basicDetailInfo);
    this.patientInfo = this.patientService.checkEmergencyContactInfo(this.patientInfo, emergencyContactInfo);
    this.patientInfo = this.patientService.checkCompanyInfo(this.patientInfo, companyInfo);

    console.log('this.patientInfo: ', this.patientInfo);
  }

  checkMedicalCoverages() {
    // Refactor this guy pls
    const newPolicyHolders = [];
    const newPolicyTypes = [];

    const currentPolicyHolders = [];
    const currentPolicyTypes = [];
    const plans = this.selectedPlans.value;

    if (plans.length < 1) {
      this.endUpdating();
      return;
    }

    plans.forEach(plan => {
      let { medicalCoverageId, planId, patientCoverageId, remarks, startDate, endDate, costCenter } = plan;

      if (plan.isNew) {
        const holderDetails = {
          identificationNumber: {
            idType: this.patientInfo.userId.idType,
            number: this.patientInfo.userId.number
          },
          name: this.patientInfo.name,
          medicalCoverageId: medicalCoverageId,
          planId: planId,
          patientCoverageId: patientCoverageId,
          specialRemarks: remarks,
          status: 'ACTIVE',
          startDate: startDate,
          endDate: endDate,
          costCenter: costCenter
        };
        const policyType = plan.coverageType;

        newPolicyHolders.push(holderDetails);
        newPolicyTypes.push(policyType);
      } else {
        const today = moment().format(DISPLAY_DATE_FORMAT);
        const endDate = plan.coverageSelected.endDate;

        const policyExpired = !moment(today, DISPLAY_DATE_FORMAT).isSameOrBefore(moment(endDate, DISPLAY_DATE_FORMAT));
        if (!policyExpired) {
          const policyHolder = this.policyHolderInfo.value.find(function(x) {
            return x.planId === plan.planId && x.medicalCoverageId === plan.medicalCoverageId;
          });

          const holderDetails = {
            id: policyHolder.id,
            identificationNumber: {
              idType: this.patientInfo.userId.idType,
              number: this.patientInfo.userId.number
            },
            name: this.patientInfo.name,
            medicalCoverageId: medicalCoverageId,
            planId: planId,
            patientCoverageId: patientCoverageId,
            specialRemarks: remarks,
            status: policyHolder.status,
            startDate: startDate,
            endDate: endDate,
            costCenter: costCenter
          };
          const policyType = plan.coverageType;

          currentPolicyHolders.push(holderDetails);
          currentPolicyTypes.push(policyType);
        }
      }
      this.selectedCoverageType.add(plan.coverageType);
    });

    // Skip updating policy when nothing new, and update patient instead
    if (newPolicyHolders.length < 1 && currentPolicyHolders.length < 1) {
      this.endUpdating();
      return;
    }

    forkJoin(
      currentPolicyHolders.map((plan, index) =>
        this.apiPatientInfoService.editPolicy(
          currentPolicyTypes[index],
          currentPolicyHolders[index].id,
          currentPolicyHolders[index]
        )
      )
    )
      .pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(
        arr => {
          console.log('updated policy holders');
          this.endUpdating();
        },
        err => this.alertService.error(JSON.stringify(err.error['message']))
      );

    forkJoin(
      newPolicyHolders.map((plan, index) =>
        this.apiPatientInfoService.assignPolicy(newPolicyTypes[index], newPolicyHolders[index])
      )
    )
      .pipe(
        debounceTime(INPUT_DELAY),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(
        arr => {
          this.endUpdating();
        },
        err => this.alertService.error(JSON.stringify(err.error['message']))
      );
  }

  checkMultipleUserAccess() {
    const currentUserName = this.store.getUser().userName;
    this.tempStore.tempStoreRetrieve(this.multipleAccessKey).subscribe(
      res => {
        if (res && res.statusCode && res.statusCode === 'S0000') {
          if (res.payload) {
            const dataJsonString = res.payload.value;
            this.currentUserAccessing = new Set(JSON.parse(dataJsonString));
            if (this.currentUserAccessing.size > 0) {
              this.alertService.warn('This page is being access by another user. Please verify before making changes');
            }
            if (!this.currentUserAccessing.has(currentUserName)) {
              // Add Current User to Set
              this.currentUserAccessing.add(currentUserName);
              // Convert Data to JSON String and store into tempstore
              const dataToJsonString = JSON.stringify(Array.from(this.currentUserAccessing));
              this.tempStore.tempStore(this.multipleAccessKey, dataToJsonString).subscribe(
                result => {
                  console.log('PAYMENT_TEMP_STORE', result);
                },
                err => {
                  this.alertService.error(JSON.stringify(err.error.message));
                }
              );
            }
          } else {
            //Add new Set
            const data = new Set();
            data.add(currentUserName);
            // Convert Data to JSON String and store into tempstore
            const dataToJsonString = JSON.stringify(Array.from(data));
            this.tempStore.tempStore(this.multipleAccessKey, dataToJsonString).subscribe(
              result => {
                console.log('PAYMENT_TEMP_STORE', res);
              },
              err => {
                this.alertService.error(JSON.stringify(err.error.message));
              }
            );
          }
        }
      },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
      }
    );
  }

  canDeactivate(): Observable<boolean> | boolean {
    this.removeCurrentUserFromTempStore();
    return true;
  }

  async removeCurrentUserFromTempStore() {
    await this.tempStore
      .tempStoreRetrieve(this.multipleAccessKey)
      .toPromise()
      .then(res => {
        if (res && res.statusCode && res.statusCode === 'S0000') {
          if (res.payload) {
            const dataJsonString = res.payload.value;
            this.currentUserAccessing = new Set(JSON.parse(dataJsonString));
          }
        }
      })
      .catch(err => this.alertService.error(JSON.stringify(err.error.message)));

    this.currentUserAccessing.delete(this.store.getUser().userName);

    console.log('PAYMENT_TEMP_STORE', this.currentUserAccessing);
    if (this.currentUserAccessing.size > 0) {
      const dataToJsonString = JSON.stringify(Array.from(this.currentUserAccessing));
      await this.tempStore
        .tempStore(this.multipleAccessKey, dataToJsonString)
        .toPromise()
        .then(result => {
          console.log('PAYMENT_TEMP_STORE', result);
        })
        .catch(err => {});
    } else {
      // delete
      await this.tempStore
        .tempStoreRemove(this.multipleAccessKey)
        .toPromise()
        .then(resss => {})
        .catch(err => {});
    }
  }

  removeConcurrentRecordSync() {
    //retreive temp store
    if (!this.multipleAccessKey) {
      return;
    }

    const response = this.tempStore.tempStoreRetrieveInSync(this.multipleAccessKey);
    const responseObj = JSON.parse(response) || {};
    if (responseObj.payload || { value: '' }.value) {
      console.log(responseObj.payload.value);
      this.currentUserAccessing = new Set(JSON.parse(responseObj.payload.value));

      let removeResponse;
      if (
        this.currentUserAccessing.size === 1 &&
        this.currentUserAccessing.values().next().value === this.store.getUser().userName
      ) {
        removeResponse = this.tempStore.tempStoreRemoveInSync(this.multipleAccessKey);
      } else {
        this.currentUserAccessing.delete(this.store.getUser().userName);
        removeResponse = this.tempStore.tempStoreInSync(
          this.multipleAccessKey,
          JSON.stringify(this.currentUserAccessing)
        );
      }
      console.log(removeResponse);
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeunloadHandler($event: any) {
    this.removeConcurrentRecordSync();
    return false;
  }

  //// Methods for toggling UI events
  toggleTabs(event) {
    if (event) {
      const index = VISIT_MANAGEMENT_TABS.findIndex(x => {
        return x === event;
      });
      this.selectedTabIndex = index ? index : 0;

      if (event === 'Dispensing' || event === 'Printing' || event === 'Payment') {
        const multipleAccessKey = `${event}_${this.store.getPatientVisitRegistryId()}`;
        if (this.multipleAccessKey !== multipleAccessKey) {
          this.removeCurrentUserFromTempStore();
          this.multipleAccessKey = multipleAccessKey;
        }
      }

      this.showSidePane = this.selectedTabIndex === 2? true : false;

      this.showSaveDraft();
    }
  }

  toggleBar(event) {
    this.isQueueHidden = event;

    const queuePane = document.querySelector('#queue-pane');
    if (queuePane.classList.contains('col-md-3')) {
      queuePane.classList.remove('col-md-3');
      queuePane.classList.add('collapsed');
    } else {
      queuePane.classList.remove('collapsed');
      queuePane.classList.add('col-md-3');
    }
  }

  onBtnSaveClicked() {
    this.consultation = this.setConsultationDataForApi();

    if(this.store.getVisitStatus()==='CONSULT'){
      this.saveConsultation();
    }else if(this.store.getVisitStatus()==='POST_CONSULT'){
      this.saveDispensing();
    }
  }

  saveConsultation(){
    this.apiPatientVisitService.saveConsultation(this.store.getPatientVisitRegistryId(), this.consultation).subscribe(
      resp => {
        alert('Consultation Saved Successfully.');
        this.isSaving = true;
        this.router.navigate(['pages/patient/list']);
      },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
        // console.log(err);
        this.isSaving = false;
      }
    );
  }

  saveDispensing(){
    this.apiPatientVisitService.saveDispensing(this.store.getPatientVisitRegistryId(), this.consultation).subscribe(
      resp => {
        alert('Dispensing Saved Successfully.');
        this.isSaving = true;
        this.router.navigate(['pages/patient/list']);
      },
      err => {
        this.alertService.error(JSON.stringify(err.error.message));
        // console.log(err);
        this.isSaving = false;
      }
    );
  }

  showSaveDraft(){

    this.selectedTabIndex = parseInt(this.selectedTabIndex);
    if(this.selectedTabIndex===3 || // On Medical Services Tab
      // (this.selectedTabIndex===2 && this.isConsultStatus()) ||  // On Consult Tab -- For 'CONSULT' Patients only
       this.selectedTabIndex===2  ||  // On Consult Tab -- For 'CONSULT' Patients only
      (this.selectedTabIndex===6 && this.isPostConsultStatus()) // On PostConsult Tab -- For 'POSTCONSULT' Patients only
    ){
      this.showSaveDraftButton = true;
    } else {
      this.showSaveDraftButton = false;
    }
  }

  onBtnConsultSaveClicked() {
    if (this.visitManagementFormGroup.get('consultationFormGroup').valid) {
      this.consultation = this.setConsultationDataForApi();
      this.apiPatientVisitService
        .postConsult(this.store.getPatientVisitRegistryId(), this.consultation)
        .pipe(
          debounceTime(INPUT_DELAY),
          distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
        )
        .subscribe(
          resp => {
            alert('Consultation Saved Successfully.');
            this.isSaving = true;
            this.router.navigate(['pages/patient/list']);
          },
          err => {
            this.alertService.error(JSON.stringify(err.error.message));
            // console.log(err);
            this.isSaving = false;
          }
        );
    } else {
      console.log('Invalid Form:', this.visitManagementFormGroup);
    }
  }

  setConsultationDataForApi() {
    this.consultation = Object.assign({}, this.visitManagementFormGroup.get('consultationFormGroup').value);
    delete this.consultation['vitalSigns'];

    console.log('consultation values: ', this.visitManagementFormGroup);

    this.consultation.dispatchItemEntities = this.caseChargeFormService.bindChargeItemsToDispatchitemEntities(
      this.visitManagementFormGroup.get('consultationFormGroup').get('dispatchItemEntities')['controls']
    );
    this.consultation.diagnosisIds = this.visitManagementFormGroup
      .get('consultationFormGroup')
      .get('diagnosisIds').value;
    this.consultation = this.consultationFormService.flattenDiagnosis(this.consultation);
    this.consultation = this.consultationFormService.checkConsultation(this.consultation);
    this.consultation = this.consultationFormService.checkPatientReferral(this.consultation);
    this.consultation = MedicalCertificateItemsArrayComponent.checkMedicalCertificates(this.consultation);
    this.consultation = this.consultationFormService.checkFollowUp(this.consultation);

    return this.consultation;
  }

  endUpdating() {
    alert("Patient's details has been updated.");
    this.router.navigate(['patient']);
  }

  formatPhone(number) {
    return this.utilsService.formatToE164PhoneNumber(number);
  }

  preventClose(event: MouseEvent) {
    event.stopImmediatePropagation();
  }

  isConsultStatus() {
    return this.store.getVisitStatus() === 'CONSULT';
  }

  isPostConsultStatus() {
    return this.store.getVisitStatus() === 'POST_CONSULT';
  }
}

// // Get Documents By Visit
// getDocumentsByVisit(){
//   // Initialise Recent Visit's Consultation and populate Documents Tab
//   const documentsArray = this.visitManagementFormGroup.get('documentsFormGroup').get('documentsArray') as FormArray;
//   console.log("patient visit registry: ",)
//   if (this.store.getPatientVisitRegistryId()) {
//     this.apiPatientVisitService.listDocuments('VISIT', this.store.getPatientVisitRegistryId()).subscribe(
//       res => {
//         const documents = (this.visitDocuments = res.payload.visitDocuments);
//         if (documents && documents.length) {
//           documents.forEach(document => {
//             documentsArray.push(
//               this.fb.group({
//                 name: document.name,
//                 document: document.fileName,
//                 description: document.description,
//                 type: document.type,
//                 size: document.size,
//                 fileId: document.fileId,
//                 clinicId: document.clinicId
//               })
//             );
//           });
//         }
//       },
//       err => this.alertService.error(JSON.stringify(err))
//     );
//   }

//   console.log("documents: ",documentsArray );
// }
