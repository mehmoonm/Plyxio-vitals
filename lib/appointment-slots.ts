// Working-day slot generation shared by both the staff and patient
// portal booking forms, so availability is shown up front instead of
// discovering a conflict only after submitting.

export const SLOT_START_HOUR = 9;
export const SLOT_END_HOUR = 17;
export const SLOT_INTERVAL_MIN = 30;

export function generateDaySlots(): string[] {
  const slots: string[] = [];
  for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL_MIN) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function isSlotInPast(date: string, time: string): boolean {
  if (!date || !time) return false;
  return new Date(`${date}T${time}`).getTime() < Date.now();
}
