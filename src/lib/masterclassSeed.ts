import crypto from "crypto";
import { MASTERCLASS_MINUTES, MASTERCLASS_PRICE, type ClassLevel, type FieldId } from "./config";
import type { Masterclass } from "./types";

// Starter masterclasses: one per class and track, so the site is not empty on day one.
// Change the titles, dates and times in Admin > Masterclasses.
type Starter = { cls: ClassLevel; field: FieldId; title: string; desc: string; day: number; hour: number };
const STARTERS: Starter[] = [
  { cls: "10", field: "foundation10", day: 0, hour: 11, title: "Class 10 boards: score 90+ without burning out", desc: "A simple weekly routine, the chapters that carry the most marks, and how to choose between Science and Commerce after Class 10." },

  { cls: "11", field: "pcm", day: 0, hour: 16, title: "Class 11 JEE: build the base that Class 12 needs", desc: "Which Class 11 Physics, Chemistry and Maths chapters come back in JEE, and how to plan the year around them." },
  { cls: "11", field: "pcb", day: 0, hour: 18, title: "Class 11 NEET: start Biology the right way", desc: "How to read NCERT Biology for NEET, a daily practice habit, and balancing Physics and Chemistry from day one." },
  { cls: "11", field: "commerce_maths", day: 1, hour: 10, title: "Class 11 Commerce with Maths: Accounts, Economics and Maths together", desc: "How to handle three heavy subjects, where students lose marks, and which careers this combination opens." },
  { cls: "11", field: "commerce_no_maths", day: 1, hour: 12, title: "Class 11 Commerce without Maths: strong in Accounts and Business", desc: "A clear study plan for Accountancy, Business Studies and Economics, and the careers that do not need Maths." },

  { cls: "12", field: "pcm", day: 1, hour: 16, title: "Class 12 JEE: boards and JEE on one timeline", desc: "How to split time between the board syllabus and JEE Main and Advanced, with a month-by-month plan till the exam." },
  { cls: "12", field: "pcb", day: 1, hour: 18, title: "Class 12 NEET: boards and NEET on one timeline", desc: "A month-by-month plan for boards and NEET, NCERT-first revision, and how many mock tests to take." },
  { cls: "12", field: "commerce_maths", day: 2, hour: 17, title: "Class 12 Commerce with Maths: boards, CUET and IPMAT", desc: "Scoring high in boards while preparing for CUET and IPMAT, and choosing between BCom, BBA, economics and CA." },
  { cls: "12", field: "commerce_no_maths", day: 2, hour: 19, title: "Class 12 Commerce without Maths: boards, CUET and CA Foundation", desc: "A board-first plan, CUET subject choices, and what the CA and CS route looks like after Class 12." },

  { cls: "dropper", field: "pcm", day: 3, hour: 17, title: "JEE drop year: from where you stand to your target rank", desc: "Finding your real gaps, a fixed weekly test habit, and avoiding last year's mistakes in the drop year." },
  { cls: "dropper", field: "pcb", day: 3, hour: 19, title: "NEET drop year: a plan for a 600+ score", desc: "Using the drop year well: NCERT revision cycles, a mock test routine, and keeping your confidence up." },
];
export const OLD_STARTER_TITLES = [
  "Class 10 boards: how to score 90+ without burning out",
  "Class 11: build the base so Class 12 feels easy",
  "Class 12: boards and entrance prep on one timeline",
  "Drop year: from where you stand to your target",
];
export const MC_SEED_VERSION = 2;

/** Next Saturday (IST) with at least two days of notice, plus `day` days, at `hour`:00 IST, as UTC ISO. */
function slotIST(day: number, hour: number) {
  const nowIST = new Date(Date.now() + 5.5 * 3600_000);
  let add = (6 - nowIST.getUTCDay() + 7) % 7;
  if (add < 2) add += 7;
  const d = Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate() + add + day, hour, 0);
  return new Date(d - 5.5 * 3600_000).toISOString();
}

export function seedMasterclasses(): Masterclass[] {
  const now = new Date().toISOString();
  return STARTERS.map((s) => ({
    id: "mc_" + crypto.randomBytes(6).toString("base64url"),
    cls: s.cls,
    field: s.field,
    title: s.title,
    desc: s.desc,
    startsAt: slotIST(s.day, s.hour),
    minutes: MASTERCLASS_MINUTES,
    price: MASTERCLASS_PRICE,
    status: "scheduled",
    createdAt: now,
  }));
}
