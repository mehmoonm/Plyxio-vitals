import type { Role } from './supabase/types';

const ADMIN: Role[] = ['HOSPITAL_ADMIN', 'SUPER_ADMIN'];

export function isAdmin(role?: Role | null) {
  return !!role && ADMIN.includes(role);
}

export function canManagePatients(role?: Role | null) {
  return !!role && [...ADMIN, 'RECEPTIONIST', 'DOCTOR', 'NURSE'].includes(role);
}

export function canManageAppointments(role?: Role | null) {
  return !!role && [...ADMIN, 'RECEPTIONIST'].includes(role);
}

export function canCheckIn(role?: Role | null) {
  return !!role && [...ADMIN, 'RECEPTIONIST', 'NURSE'].includes(role);
}

export function canDoEncounters(role?: Role | null) {
  return !!role && [...ADMIN, 'DOCTOR'].includes(role);
}

export function canRecordVitals(role?: Role | null) {
  return !!role && [...ADMIN, 'NURSE', 'DOCTOR'].includes(role);
}

export function canManageStaff(role?: Role | null) {
  return isAdmin(role);
}

export function canManageInventory(role?: Role | null) {
  return !!role && [...ADMIN, 'PHARMACIST'].includes(role);
}

export function canManageBilling(role?: Role | null) {
  return !!role && [...ADMIN, 'BILLING_CLERK'].includes(role);
}

export function canManageLab(role?: Role | null) {
  return !!role && [...ADMIN, 'LAB_TECHNICIAN', 'DOCTOR'].includes(role);
}

export function canManageRadiology(role?: Role | null) {
  return !!role && [...ADMIN, 'RADIOLOGIST', 'DOCTOR'].includes(role);
}
