import { FIELDS, PRICES, type ClassLevel, type FieldId } from "./config";
import type { Enrollment, User } from "./types";

// Batches. Most batches are "class + field" (e.g. Class 11 PCM).
// Class 12 Science is split into four tracks, each its own batch:
//   JEE, NEET (competitive: Class 11 + 12 syllabus) and Boards PCM, Boards PCB (Class 12 syllabus only).
// A batch is stored on the enrollment as (cls, field) where field is a FieldId or a Track.

export type Track = "jee" | "neet" | "boards_pcm" | "boards_pcb";
export type BatchField = FieldId | Track;

export const TRACKS: Record<
  Track,
  {
    label: { en: string; hi: string };
    blueprint: FieldId; // test pattern used for this batch's tests
    exam: "jee" | "neet" | "board";
    competitive: boolean; // JEE/NEET level questions in batch tests
    price: number;
    forFields: FieldId[]; // which Class 12 students can join
    goals: string;
  }
> = {
  jee: {
    label: { en: "Class 12 JEE", hi: "कक्षा 12 JEE" },
    blueprint: "pcm",
    exam: "jee",
    competitive: true,
    price: PRICES["12"],
    forFields: ["pcm", "pcmb"],
    goals: "JEE Main, JEE Advanced, BITSAT, state CETs",
  },
  neet: {
    label: { en: "Class 12 NEET", hi: "कक्षा 12 NEET" },
    blueprint: "pcb",
    exam: "neet",
    competitive: true,
    price: PRICES["12"],
    forFields: ["pcb", "pcmb"],
    goals: "NEET UG: MBBS, BDS, AYUSH, nursing, allied health",
  },
  boards_pcm: {
    label: { en: "Class 12 Boards PCM", hi: "कक्षा 12 बोर्ड्स PCM" },
    blueprint: "pcm",
    exam: "board",
    competitive: false,
    price: 599,
    forFields: ["pcm", "pcmb"],
    goals: "Class 12 boards (Physics, Chemistry, Maths) and CUET",
  },
  boards_pcb: {
    label: { en: "Class 12 Boards PCB", hi: "कक्षा 12 बोर्ड्स PCB" },
    blueprint: "pcb",
    exam: "board",
    competitive: false,
    price: 599,
    forFields: ["pcb", "pcmb"],
    goals: "Class 12 boards (Physics, Chemistry, Biology) and CUET",
  },
};
export const TRACK_IDS = Object.keys(TRACKS) as Track[];

export const isTrack = (f: string | undefined): f is Track => Boolean(f && f in TRACKS);

/** Does this class + field choose between tracks? (Class 12 Science) */
export function hasTracks(cls: ClassLevel, field: FieldId) {
  return cls === "12" && FIELDS[field]?.stream === "science";
}

/** Batches a student of this class and field can join. */
export function batchOptions(cls: ClassLevel, field: FieldId): BatchField[] {
  if (!hasTracks(cls, field)) return [field];
  return TRACK_IDS.filter((t) => TRACKS[t].forFields.includes(field));
}

/** Every batch that exists (for admin pickers). */
export function allBatches(): { cls: ClassLevel; field: BatchField }[] {
  const out: { cls: ClassLevel; field: BatchField }[] = [];
  for (const f of Object.values(FIELDS))
    for (const cls of f.classes) {
      if (hasTracks(cls, f.id)) continue;
      out.push({ cls, field: f.id });
    }
  for (const t of TRACK_IDS) out.push({ cls: "12", field: t });
  const order = ["10", "11", "12", "dropper"];
  return out.sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));
}

export function batchLabel(cls: string, field: string, lang: "en" | "hi" = "en") {
  if (isTrack(field)) return TRACKS[field].label[lang];
  const f = FIELDS[field as FieldId];
  const c = cls === "dropper" ? (lang === "hi" ? "ड्रॉपर" : "Dropper") : `${lang === "hi" ? "कक्षा" : "Class"} ${cls}`;
  return `${c} ${f ? f.label[lang] : field}`;
}

/** The field label alone (no class), e.g. "JEE", "Science: PCM". */
export function batchFieldLabel(field: string, lang: "en" | "hi" = "en") {
  if (isTrack(field)) return TRACKS[field].label[lang].replace(/^(Class 12|कक्षा 12) /, "");
  return FIELDS[field as FieldId]?.label[lang] || field;
}

export function batchPrice(cls: ClassLevel, field: BatchField) {
  return isTrack(field) ? TRACKS[field].price : PRICES[cls];
}

/** Test pattern for a batch's tests. */
export function blueprintField(field: BatchField): FieldId {
  return isTrack(field) ? TRACKS[field].blueprint : field;
}

export function isValidBatch(cls: string, field: string) {
  if (isTrack(field)) return cls === "12";
  const f = FIELDS[field as FieldId];
  return Boolean(f && f.classes.includes(cls as ClassLevel) && !hasTracks(cls as ClassLevel, field as FieldId));
}

/**
 * The batch an enrollment belongs to. Older Class 12 Science enrollments (before tracks) count as
 * JEE (PCM, PCMB) or NEET (PCB), the same mapping the database upgrade applies.
 */
export function batchOfEnrollment(enr: Pick<Enrollment, "cls" | "field">, user?: User): { cls: ClassLevel; field: BatchField } {
  const cls = (enr.cls || user?.profile?.cls || "12") as ClassLevel;
  const field = (enr.field || user?.profile?.field || "pcm") as BatchField;
  if (!isTrack(field) && hasTracks(cls, field)) return { cls, field: field === "pcb" ? "neet" : "jee" };
  return { cls, field };
}

/** The student's batch: the active enrollment's, else what their profile would join by default. */
export function batchOf(user: User): { cls: ClassLevel; field: BatchField } {
  const now = Date.now();
  const enr = (user.enrollments || []).find((e) => !e.expiresAt || new Date(e.expiresAt).getTime() > now);
  if (enr) return batchOfEnrollment(enr, user);
  const p = user.profile!;
  return { cls: p.cls, field: batchOptions(p.cls, p.field)[0] };
}
