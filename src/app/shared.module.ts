import { ProblemListItemComponent } from './components/business-components/consultation/consultation-problem-list/problem-list-item/problem-list-item.component';
import { VitalChartComponent } from './components/business-components/vital/vital-chart/vital-chart.component';
import { ConsultationMemoComponent } from './components/business-components/consultation/consultation-memo/consultation-memo.component';
import { ConsultationFollowUpComponent } from './components/business-components/consultation/consultation-follow-up/consultation-follow-up.component';
import { ConsultationReferralComponent } from './components/business-components/consultation/consultation-referral/consultation-referral.component';
import { TouchedObjectDirective } from './directives/touched/touched.object.directive';
import { ClinicNotesComponent } from './components/business-components/consultation/clinic-notes/clinic-notes.component';
import { OngoingMedicationItemComponent } from './components/business-components/consultation/consultation-ongoing-medication/ongoing-medication-item/ongoing-medication-item.component';
import { ConsultationOngoingMedicationComponent } from './components/business-components/consultation/consultation-ongoing-medication/consultation-ongoing-medication.component';
import { ConsultationPatientAlertInfoComponent } from './components/business-components/consultation/consultation-patient-info/consultation-patient-alert-info/consultation-patient-alert-info.component';
import { ConsultationHistoryItemComponent } from './components/business-components/consultation/consultation-history/consultation-history-item/consultation-history-item.component';
import { ConsultationHistoryComponent } from './components/business-components/consultation/consultation-history/consultation-history.component';
import { ConsultationHistoryMainContainerComponent } from './components/business-components/consultation/consultation-history/consultation-history-main-container/consultation-history-main-container.component';
import { ConsultationDiagnosisItemComponent } from './components/business-components/consultation/consultation-diagnosis/consultation-diagnosis-item/consultation-diagnosis-item.component';
import { ConsultationNotesComponent } from './components/business-components/consultation/consultation-notes/consultation-notes.component';
import { ConsultationPatientInfoComponent } from './components/business-components/consultation/consultation-patient-info/consultation-patient-info.component';
import { AppointmentsNewComponent } from './views/components/business/appointments/appointments-new/appointments-new.component';
import { PatientAddQueueConfirmationComponent } from './components/business-components/patient-add/patient-add-queue-confirmation/patient-add-queue-confirmation.component';
import { PatientAddConsultationComponent } from './components/business-components/patient-add/patient-add-consultation/patient-add-consultation.component';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ChartsModule } from 'ng2-charts/ng2-charts';
import { CKEditorModule } from 'ng2-ckeditor';
import { FileUploadModule } from 'ng2-file-upload';
import { InternationalPhoneModule } from 'ng4-intl-phone';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { PopoverModule } from 'ngx-bootstrap/popover';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { NgxPermissionsModule } from 'ngx-permissions';

import { HeaderRegistryContentComponent } from './components/app-components/header-registry/header-registry-content/header-registry-content.component';
import { HeaderRegistryComponent } from './components/app-components/header-registry/header-registry.component';
import { PatientAddAlertsInfoAddClinicalComponent } from './components/business-components/patient-add/patient-add-alerts-info/patient-add-alerts-info-add-clinical/patient-add-alerts-info-add-clinical.component';
import { PatientDetailAddDocumentComponent } from './components/business-components/patient-detail/patient-detail-document/patient-detail-add-document/patient-detail-add-document.component';
import { PatientDetailTagAddAlertComponent } from './components/business-components/patient-detail/patient-detail-tag/patient-detail-tag-add-alert/patient-detail-tag-add-alert.component';
import { PatientHistoryDetailAddDocumentComponent } from './components/business-components/patient-detail/patient-history-detail/patient-history-detail-add-document/patient-history-detail-add-document.component';
import { PatientHistoryDetailEditNoteComponent } from './components/business-components/patient-detail/patient-history-detail/patient-history-detail-edit-note/patient-history-detail-edit-note.component';
import { PatientHistoryDetailEditCertificateComponent } from './components/business-components/patient-detail/patient-history-detail/patient-history-detail-edit-certificate/patient-history-detail-edit-certificate.component';
import { PatientHistoryDetailEditCertificateItemComponent } from './components/business-components/patient-detail/patient-history-detail/patient-history-detail-edit-certificate/patient-history-detail-edit-certificate-item.component';
import { PaymentConfirmComponent } from './components/business-components/payment/payment-confirm/payment-confirm.component';
import { PaymentSelectionComponent } from './components/business-components/payment/payment-selection/payment-selection.component';
import { DrugInputSearchModalComponent } from './components/app-components/shared/drug-input-search-modal/drug-input-search-modal.component';
import { DrugInputSearchComponent } from './components/app-components/shared/drug-input-search/drug-input-search.component';
import { ErrorsComponent } from './components/app-components/shared/form/errors/errors.component';
import { SimpleErrorComponent } from './components/app-components/shared/simple-error/simple-error.component';
import { AlertComponent } from './directives/alert/alert.component';
import { DisplayDatePipe } from './pipes/display-date.pipe';
import { DisplayHour } from './pipes/display-hour.pipe';
import { ClinicSelectComponent } from './views/components/business/clinic/clinic-select/clinic-select.component';
import { FollowUpsComponent } from './views/components/business/communications/follow-ups/follow-ups.component';import { ReferralItemComponent } from './components/business-components/consultation/consultation-referral/referral-item/referral-item.component';
import { RouterModule } from '../../node_modules/@angular/router';
import { LoadingComponent } from './components/app-components/loading/loading.component';
import { LoadingRetryComponent } from './components/app-components/loading-retry/loading-retry.component';
import { DiscountComponent } from './components/business-components/consultation/discount/discount.component';
import { AddAppointmentComponent } from './components/business-components/appointments/add-appointment/add-appointment.component';
import { ConsultationDiagnosisComponent } from './components/business-components/consultation/consultation-diagnosis/consultation-diagnosis.component';
import { ConsultationProblemListComponent } from './components/business-components/consultation/consultation-problem-list/consultation-problem-list.component';
import { ConsultationDocumentsComponent } from './components/business-components/consultation/consultation-documents/consultation-documents.component';
import { ConsultationPrescriptionComponent } from './components/business-components/consultation/consultation-prescription/consultation-prescription.component';
import { PrescriptionItemComponent } from './components/business-components/consultation/consultation-prescription/prescription-item/prescription-item.component';
import { MedicalCertificateItemsArrayComponent } from './components/business-components/consultation/consultation-medical-certificate/medical-certificate-items-array.component';
import { MedicalCertificateItemControlComponent } from './components/business-components/consultation/consultation-medical-certificate/medical-certificate-item-control.component';
import { ConsultationSearchComponent } from './components/business-components/consultation/consultation-prescription/consultation-search/consultation-search.component';
import { DisplayDollarPipe } from './pipes/display-dollar.pipe';
import { VitalAddComponent } from './components/business-components/vital/vital-add/vital-add.component';
import { VitalTableComponent } from './components/business-components/vital/vital-table/vital-table.component';
import { VitalAddItemComponent } from './components/business-components/vital/vital-add/vital-add-item/vital-add-item.component';
import { VitalContainerComponent } from './components/business-components/vital/vital-container/vital-container.component';
import { AutoLogoutPopupComponent } from './views/pages/auto-logout-popup/auto-logout-popup.component';

const APP_VITAL = [
  VitalChartComponent,
  VitalAddComponent,
  VitalTableComponent,
  VitalAddItemComponent,
  VitalContainerComponent
];
@NgModule({
  imports: [
    CommonModule,
    NgxDatatableModule,
    FormsModule,
    ReactiveFormsModule,
    AccordionModule.forRoot(),
    InternationalPhoneModule,
    BsDropdownModule.forRoot(),
    BsDatepickerModule.forRoot(),
    ModalModule.forRoot(),
    TimepickerModule.forRoot(),
    ModalModule.forRoot(),
    NgSelectModule,
    PopoverModule.forRoot(),
    CollapseModule.forRoot(),
    TabsModule.forRoot(),
    CKEditorModule,
    ChartsModule,
    AngularSvgIconModule,
    FileUploadModule,
    NgxPermissionsModule,
    RouterModule
  ],
  exports: [
    CommonModule,
    NgxDatatableModule,
    NgSelectModule,
    AlertComponent,
    AccordionModule,
    ErrorsComponent,
    FormsModule,
    ReactiveFormsModule,
    InternationalPhoneModule,
    BsDropdownModule,
    ModalModule,
    DisplayDatePipe,
    DisplayHour,
    DisplayDollarPipe,
    PopoverModule,
    TabsModule,
    CollapseModule,
    BsDatepickerModule,
    CKEditorModule,
    TimepickerModule,
    ModalModule,
    ChartsModule,
    AngularSvgIconModule,
    FileUploadModule,
    NgxPermissionsModule,
    TouchedObjectDirective,

    HeaderRegistryComponent,
    HeaderRegistryContentComponent,
    SimpleErrorComponent,
    DrugInputSearchComponent,
    DrugInputSearchModalComponent,
    ClinicSelectComponent,
    FollowUpsComponent,
    ReferralItemComponent,
    RouterModule,
    LoadingComponent,
    LoadingRetryComponent,
    PatientAddQueueConfirmationComponent,
    PatientAddConsultationComponent,
    DiscountComponent,
    AddAppointmentComponent,
    AppointmentsNewComponent,
    ConsultationPatientInfoComponent,
    ConsultationPatientAlertInfoComponent,
    ConsultationNotesComponent,
    ConsultationDiagnosisComponent,
    ConsultationDiagnosisItemComponent,
    ConsultationHistoryMainContainerComponent,
    ConsultationHistoryItemComponent,
    ConsultationHistoryComponent,
    ConsultationProblemListComponent,
    ProblemListItemComponent,
    ConsultationOngoingMedicationComponent,
    OngoingMedicationItemComponent,
    ConsultationDocumentsComponent,
    ConsultationPrescriptionComponent,
    PrescriptionItemComponent,
    ConsultationReferralComponent,
    ClinicNotesComponent,
    MedicalCertificateItemsArrayComponent,
    MedicalCertificateItemControlComponent,
    ConsultationFollowUpComponent,
    ConsultationMemoComponent,
    ConsultationSearchComponent,
    ...APP_VITAL
  ],
  declarations: [
    AlertComponent,
    ErrorsComponent,
    DisplayDatePipe,
    DisplayHour,
    DisplayDollarPipe,
    PatientDetailTagAddAlertComponent,
    PatientAddAlertsInfoAddClinicalComponent,
    PatientDetailAddDocumentComponent,
    PatientHistoryDetailAddDocumentComponent,
    PatientHistoryDetailEditNoteComponent,
    PatientHistoryDetailEditCertificateComponent,
    PatientHistoryDetailEditCertificateItemComponent,
    PaymentConfirmComponent,
    PaymentSelectionComponent,
    HeaderRegistryComponent,
    HeaderRegistryContentComponent,
    SimpleErrorComponent,
    DrugInputSearchComponent,
    DrugInputSearchModalComponent,
    ClinicSelectComponent,
    FollowUpsComponent,
    ReferralItemComponent,
    LoadingComponent,
    LoadingRetryComponent,
    PatientAddConsultationComponent,
    PatientAddQueueConfirmationComponent,
    DiscountComponent,
    DiscountComponent,
    AddAppointmentComponent,
    AppointmentsNewComponent,
    ConsultationPatientInfoComponent,
    ConsultationPatientAlertInfoComponent,
    ConsultationPrescriptionComponent,
    PrescriptionItemComponent,
    ConsultationNotesComponent,
    ConsultationDiagnosisComponent,
    ConsultationDiagnosisItemComponent,
    ConsultationHistoryMainContainerComponent,
    ConsultationHistoryItemComponent,
    ConsultationHistoryComponent,
    ConsultationProblemListComponent,
    ProblemListItemComponent,
    ConsultationOngoingMedicationComponent,
    OngoingMedicationItemComponent,
    ConsultationDocumentsComponent,
    ConsultationReferralComponent,
    MedicalCertificateItemsArrayComponent,
    MedicalCertificateItemControlComponent,
    ConsultationFollowUpComponent,
    ConsultationMemoComponent,
    AutoLogoutPopupComponent,

    TouchedObjectDirective,
    ClinicNotesComponent,
    ConsultationSearchComponent,
    ...APP_VITAL
  ],
  entryComponents: [
    PatientAddAlertsInfoAddClinicalComponent,
    PatientAddConsultationComponent,
    PatientDetailTagAddAlertComponent,
    PatientDetailAddDocumentComponent,
    PatientHistoryDetailAddDocumentComponent,
    PatientHistoryDetailEditNoteComponent,
    PatientHistoryDetailEditCertificateComponent,
    PatientHistoryDetailEditCertificateItemComponent,
    PaymentConfirmComponent,
    PaymentSelectionComponent,
    DrugInputSearchModalComponent,
    ClinicSelectComponent,
    FollowUpsComponent,
    ReferralItemComponent,
    PatientAddQueueConfirmationComponent,

    PatientAddQueueConfirmationComponent,
    AppointmentsNewComponent,
    ConsultationPatientInfoComponent,
    ConsultationPatientAlertInfoComponent,
    ConsultationNotesComponent,
    ConsultationDiagnosisComponent,
    ConsultationDiagnosisItemComponent,
    ConsultationHistoryMainContainerComponent,
    ConsultationHistoryComponent,
    ConsultationHistoryItemComponent,
    ConsultationReferralComponent,
    ConsultationProblemListComponent,
    ProblemListItemComponent,
    ConsultationOngoingMedicationComponent,
    OngoingMedicationItemComponent,
    ConsultationDocumentsComponent,
    ConsultationPrescriptionComponent,
    PrescriptionItemComponent,
    ClinicNotesComponent,
    MedicalCertificateItemsArrayComponent,
    MedicalCertificateItemControlComponent,
    ConsultationFollowUpComponent,
    ConsultationMemoComponent,
    ConsultationSearchComponent,
    VitalAddComponent,
    AutoLogoutPopupComponent
  ]
})
export class SharedModule {}
