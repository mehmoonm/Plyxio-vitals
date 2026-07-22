// Types matching the real PLYXIO HMS Supabase schema (public schema).
// These mirror actual DB columns rather than the old mock-data shapes.

export type Role =
  | 'SUPER_ADMIN' | 'HOSPITAL_ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST'
  | 'PHARMACIST' | 'LAB_TECHNICIAN' | 'RADIOLOGIST' | 'BILLING_CLERK' | 'ACCOUNTANT';

export interface DbUser {
  id: string;
  hospitalId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  departmentId: string | null;
  specialty: string | null;
  licenseNo: string | null;
  isActive: boolean;
  messagingEnabled?: boolean;
}

export interface DbMessage {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  senderRole: 'PATIENT' | 'DOCTOR';
  body: string;
  readAt: string | null;
  createdAt: string;
  User?: DbUser;
}

export interface DbPatient {
  id: string;
  hospitalId: string;
  mrn: string;
  fullName: string;
  fatherOrHusbandName: string | null;
  cnic: string | null;
  dateOfBirth: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  knownConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DbAppointment {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  reason: string | null;
  status: 'SCHEDULED' | 'CHECKED_IN' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  tokenNumber: number | null;
  Patient?: DbPatient;
  User?: DbUser;
}

export interface DbInvoice {
  id: string;
  hospitalId: string;
  patientId: string;
  invoiceNo: string;
  status: 'DRAFT' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'WRITTEN_OFF';
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  createdAt: string;
  Patient?: DbPatient;
}

export interface DbDrug {
  id: string;
  hospitalId: string;
  name: string;
  genericName: string | null;
  form: string | null;
  strength: string | null;
}

export interface DbInventoryItem {
  id: string;
  hospitalId: string;
  drugId: string;
  batchNo: string | null;
  expiryDate: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  unitCost: number | null;
  unitPrice: number | null;
  Drug?: DbDrug;
}

export interface DbVitals {
  id: string;
  encounterId: string;
  recordedAt: string;
  temperatureC: number | null;
  pulseBpm: number | null;
  respRateBpm: number | null;
  bloodPressureSys: number | null;
  bloodPressureDia: number | null;
  spo2Percent: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  painScore: number | null;
}

export interface DbEncounter {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  admissionId: string | null;
  encounterType: string;
  chiefComplaint: string | null;
  historyOfPresentIllness: string | null;
  examinationFindings: string | null;
  diagnosis: string | null;
  diagnosisIcd10: string | null;
  plan: string | null;
  followUpDate: string | null;
  notes: string | null;
  signedAt: string | null;
  createdAt: string;
  Patient?: DbPatient;
  User?: DbUser;
  Vitals?: DbVitals[];
}

export interface DbPrescriptionItem {
  id: string;
  prescriptionId: string;
  drugId: string;
  dose: string | null;
  frequency: string | null;
  route: string | null;
  durationDays: number | null;
  instructions: string | null;
  quantity: number | null;
  Drug?: DbDrug;
}

export interface DbPrescription {
  id: string;
  encounterId: string;
  createdAt: string;
  notes: string | null;
  PrescriptionItem?: DbPrescriptionItem[];
  Encounter?: { patientId: string; Patient?: DbPatient };
  Dispense?: DbDispense[];
}

export interface DbStockTransaction {
  id: string;
  inventoryItemId: string;
  type: 'RECEIVE' | 'DISPENSE' | 'ADJUSTMENT' | 'RETURN' | 'EXPIRED_WRITE_OFF';
  quantity: number;
  reference: string | null;
  performedById: string | null;
  createdAt: string;
}

export interface DbDispenseItem {
  id: string;
  dispenseId: string;
  inventoryItemId: string;
  quantity: number;
  InventoryItem?: DbInventoryItem;
}

export interface DbDispense {
  id: string;
  prescriptionId: string;
  dispensedById: string;
  dispensedAt: string;
  User?: DbUser;
  DispenseItem?: DbDispenseItem[];
}

export interface DbPatientDocument {
  id: string;
  patientId: string;
  title: string;
  fileUrl: string;
  category: string | null;
  uploadedAt: string;
}

export interface DbAuditLog {
  id: string;
  hospitalId: string | null;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  User?: DbUser;
}

export interface DbWard {
  id: string;
  hospitalId: string;
  name: string;
  wardType: string | null;
  floor: string | null;
}

export interface DbBed {
  id: string;
  hospitalId: string;
  wardId: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'OUT_OF_SERVICE';
  dailyRate: number | null;
  Ward?: DbWard;
}

export interface DbAdmission {
  id: string;
  hospitalId: string;
  patientId: string;
  bedId: string;
  attendingDoctorId: string;
  admittedAt: string;
  reasonForAdmission: string | null;
  status: 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED' | 'DECEASED';
  dischargedAt: string | null;
  dischargeSummary: string | null;
  dischargeDiagnosis: string | null;
  followUpInstructions: string | null;
  Patient?: DbPatient;
  User?: DbUser;
  Bed?: DbBed;
}

export interface DbNursingNote {
  id: string;
  admissionId: string;
  note: string;
  recordedById: string;
  recordedAt: string;
  User?: DbUser;
}

export interface DbLabTestCatalog {
  id: string;
  hospitalId: string;
  name: string;
  code: string | null;
  sampleType: string | null;
  price: number | null;
  normalRange: string | null;
}

export interface DbLabOrderItem {
  id: string;
  labOrderId: string;
  labTestId: string;
  result: string | null;
  resultUnit: string | null;
  isAbnormal: boolean | null;
  resultNotes: string | null;
  resultedAt: string | null;
  resultedById: string | null;
  LabTestCatalog?: DbLabTestCatalog;
}

export interface DbLabOrder {
  id: string;
  hospitalId: string;
  patientId: string;
  encounterId: string | null;
  orderedById: string;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'RESULT_READY' | 'CANCELLED';
  orderedAt: string;
  priority: string;
  Patient?: DbPatient;
  User?: DbUser;
  LabOrderItem?: DbLabOrderItem[];
}

export interface DbRadiologyReport {
  id: string;
  radiologyOrderId: string;
  findings: string | null;
  impression: string | null;
  imageUrl: string | null;
  reportedById: string | null;
  reportedAt: string;
}

export interface DbRadiologyOrder {
  id: string;
  hospitalId: string;
  patientId: string;
  encounterId: string | null;
  orderedById: string;
  studyType: string;
  bodyPart: string | null;
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'IN_PROGRESS' | 'RESULT_READY' | 'CANCELLED';
  priority: string;
  orderedAt: string;
  Patient?: DbPatient;
  User?: DbUser;
  RadiologyReport?: DbRadiologyReport[];
}
