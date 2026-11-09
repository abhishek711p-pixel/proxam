import "server-only";
import { CALL, counsellorCapacity } from "./config";
import { slotCounts } from "./store";

const IST = "+05:30";

function istDate(d: Date) {
  // yyyy-mm-dd in IST
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

type Slot = { start: string; available: boolean };
type Day = { date: string; slots: Slot[] };

export async function buildSlots(): Promise<Day[]> {
  const now = Date.now();
  const earliest = now + CALL.leadHours * 3600_000;
  const cap = counsellorCapacity();
  const taken = await slotCounts(new Date(now).toISOString(), new Date(now + (CALL.daysAhead + 2) * 86400_000).toISOString());
  const days: Day[] = [];
  for (let d = 0; d <= CALL.daysAhead; d++) {
    const date = istDate(new Date(now + d * 86400_000));
    const slots: Slot[] = [];
    for (let m = CALL.startHour * 60; m + CALL.slotMin <= CALL.endHour * 60; m += CALL.slotMin) {
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      const start = `${date}T${hh}:${mm}:00${IST}`;
      const ts = new Date(start).getTime();
      if (ts < earliest) continue;
      slots.push({ start, available: (taken.get(ts.toString()) || 0) < cap });
    }
    if (slots.length) days.push({ date, slots });
  }
  return days;
}

/** Is this a real slot in the booking window? (Capacity is checked again, safely, when booking.) */
export async function isBookable(start: string) {
  return (await buildSlots()).some((d) => d.slots.some((s) => s.start === start && s.available));
}
