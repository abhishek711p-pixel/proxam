// Central settings. Change the brand name, test blueprints and limits here.

export const BRAND = "Proxam";
export const FREE_ATTEMPTS = 3; // first attempt + two retakes (PRD 7.2)
export const MASTERCLASS_PRICE = 1; // first masterclass for each batch
export const MASTERCLASS_MINUTES = 60;
export const EXTRA_TEST_PRICE = 49; // each test after the free ones, one payment = one test
export const SUBMIT_GRACE_SEC = 60; // network grace after the timer ends
export const SYNC_EVERY_SEC = 30; // how often answers are synced to the server

// Paid batch. One-time fee (no monthly or renewal fee). Price depends on class, same for Science and Commerce.
// Class 12 Science has four batches with their own prices: see TRACKS in src/lib/batches.ts (Boards ₹599).
export const PRICES: Record<"10" | "11" | "12" | "dropper", number> = {
  "10": 299,
  "11": 499,
  "12": 799,
  dropper: 999,
};
export function priceFor(cls: ClassLevel) {
  return PRICES[cls];
}


export type ClassLevel = "10" | "11" | "12" | "dropper";
export const CLASSES: ClassLevel[] = ["10", "11", "12", "dropper"];

export function classLabel(cls: ClassLevel, lang: "en" | "hi" = "en") {
  if (cls === "dropper") return lang === "hi" ? "ड्रॉपर" : "Dropper";
  return lang === "hi" ? `कक्षा ${cls}` : `Class ${cls}`;
}
export type Stream = "foundation" | "science" | "commerce";
export type Part = "A" | "B" | "C";

export type FieldId =
  | "foundation10"
  | "pcm"
  | "pcb"
  | "pcmb"
  | "commerce_maths"
  | "commerce_no_maths";

export interface Section {
  part: Part;
  subject: string; // must match Question.subject in the bank
  count: number;
}

export interface FieldConfig {
  id: FieldId;
  stream: Stream;
  classes: ClassLevel[];
  label: { en: string; hi: string };
  goals: string;
  durationMin: number;
  sections: Section[]; // counts used when no favourite subject is picked (and for batch checkpoint tests)
  /** PCM / PCB: the student picks a favourite subject before the test; it gets `count` questions, the others `others` each. */
  favourite?: { count: number; others: number };
}

// Test blueprint per field (changed Nov 2026):
// PCM, PCB: 35 questions. Favourite subject 15, the other two 10 each.
// PCMB: 35 questions. 8 per subject + 3 career questions.
// Commerce (with or without Maths): 30 questions, all from the field's subjects.
// Class 10: 30 questions. 5 each of Maths, Biology, Physics, Chemistry, Social Studies (History + Geography) and career.
export const FIELDS: Record<FieldId, FieldConfig> = {
  foundation10: {
    id: "foundation10",
    stream: "foundation",
    classes: ["10"],
    label: { en: "Class 10 Foundation", hi: "कक्षा 10 फाउंडेशन" },
    goals: "Find the best-fit stream: Science (PCM/PCB) or Commerce",
    durationMin: 35,
    sections: [
      { part: "A", subject: "Maths (Class 10)", count: 5 },
      { part: "A", subject: "Biology (Class 10)", count: 5 },
      { part: "A", subject: "Physics (Class 10)", count: 5 },
      { part: "A", subject: "Chemistry (Class 10)", count: 5 },
      { part: "A", subject: "Social Studies", count: 5 },
      { part: "C", subject: "Career Fit", count: 5 },
    ],
  },
  pcm: {
    id: "pcm",
    stream: "science",
    classes: ["11", "12", "dropper"],
    label: { en: "Science: PCM", hi: "साइंस: PCM" },
    goals: "JEE Main/Advanced, state CETs, BITSAT, architecture, defence, BSc",
    durationMin: 45,
    favourite: { count: 15, others: 10 },
    sections: [
      { part: "A", subject: "Physics", count: 12 },
      { part: "A", subject: "Chemistry", count: 12 },
      { part: "A", subject: "Mathematics", count: 11 },
    ],
  },
  pcb: {
    id: "pcb",
    stream: "science",
    classes: ["11", "12", "dropper"],
    label: { en: "Science: PCB", hi: "साइंस: PCB" },
    goals: "NEET, BDS, pharmacy, nursing, allied health, biotech, agriculture",
    durationMin: 45,
    favourite: { count: 15, others: 10 },
    sections: [
      { part: "A", subject: "Physics", count: 12 },
      { part: "A", subject: "Chemistry", count: 12 },
      { part: "A", subject: "Biology", count: 11 },
    ],
  },
  pcmb: {
    id: "pcmb",
    stream: "science",
    classes: ["11", "12", "dropper"],
    label: { en: "Science: PCMB", hi: "साइंस: PCMB" },
    goals: "Keeps both engineering and medical options open",
    durationMin: 45,
    sections: [
      { part: "A", subject: "Physics", count: 8 },
      { part: "A", subject: "Chemistry", count: 8 },
      { part: "A", subject: "Mathematics", count: 8 },
      { part: "A", subject: "Biology", count: 8 },
      { part: "C", subject: "Career Fit", count: 3 },
    ],
  },
  commerce_maths: {
    id: "commerce_maths",
    stream: "commerce",
    classes: ["11", "12", "dropper"],
    label: { en: "Commerce with Maths", hi: "कॉमर्स (मैथ्स के साथ)" },
    goals: "BCom (Hons), BBA, BMS, Economics (Hons), Statistics, Actuarial, CUET",
    durationMin: 40,
    sections: [
      { part: "A", subject: "Accountancy", count: 8 },
      { part: "A", subject: "Business Studies", count: 7 },
      { part: "A", subject: "Economics", count: 8 },
      { part: "A", subject: "Mathematics", count: 7 },
    ],
  },
  commerce_no_maths: {
    id: "commerce_no_maths",
    stream: "commerce",
    classes: ["11", "12", "dropper"],
    label: { en: "Commerce without Maths", hi: "कॉमर्स (बिना मैथ्स)" },
    goals: "BCom, BBA, CA/CS/CMA Foundation, CLAT/CUET, Hotel Mgmt, Mass Comm",
    durationMin: 40,
    sections: [
      { part: "A", subject: "Accountancy", count: 10 },
      { part: "A", subject: "Business Studies", count: 10 },
      { part: "A", subject: "Economics", count: 10 },
    ],
  },
};

/** Subjects a student can pick as favourite (empty when the field has no favourite choice). */
export function favouriteOptions(f: FieldConfig) {
  return f.favourite ? f.sections.filter((s) => s.part === "A").map((s) => s.subject) : [];
}

/** The sections of one test: with a favourite subject, it gets more questions. */
export function sectionsFor(f: FieldConfig, favourite?: string): Section[] {
  if (!f.favourite || !favourite || !favouriteOptions(f).includes(favourite)) return f.sections;
  return f.sections.map((s) => (s.part !== "A" ? s : { ...s, count: s.subject === favourite ? f.favourite!.count : f.favourite!.others }));
}

export function fieldsFor(cls: ClassLevel, stream?: Stream): FieldConfig[] {
  return Object.values(FIELDS).filter(
    (f) => f.classes.includes(cls) && (!stream || f.stream === stream),
  );
}

export function totalQuestions(f: FieldConfig) {
  return f.sections.reduce((s, x) => s + x.count, 0);
}

export const PART_LABEL: Record<Part, { en: string; hi: string }> = {
  A: { en: "Subject Knowledge", hi: "विषय ज्ञान" },
  B: { en: "Aptitude & Reasoning", hi: "एप्टीट्यूड और रीज़निंग" },
  C: { en: "Stream & Career Fit", hi: "स्ट्रीम और करियर फिट" },
};

/** Hindi names for test subjects (English names are the keys used in the question bank). */
export const TEST_SUBJECT_HI: Record<string, string> = {
  Physics: "फ़िज़िक्स",
  Chemistry: "केमिस्ट्री",
  Mathematics: "मैथ्स",
  Biology: "बायोलॉजी",
  Accountancy: "अकाउंटेंसी",
  "Business Studies": "बिज़नेस स्टडीज़",
  Economics: "इकोनॉमिक्स",
  "Maths (Class 10)": "मैथ्स",
  "Physics (Class 10)": "फ़िज़िक्स",
  "Chemistry (Class 10)": "केमिस्ट्री",
  "Biology (Class 10)": "बायोलॉजी",
  "Social Studies": "सोशल स्टडीज़ (इतिहास + भूगोल)",
  "Career Fit": "करियर फिट",
};

export function testSubjectLabel(subject: string, lang: "en" | "hi") {
  if (lang === "hi") return TEST_SUBJECT_HI[subject] || subject;
  if (subject === "Social Studies") return "Social Studies (History + Geography)";
  return subject.replace(" (Class 10)", "");
}

export const BOARDS = ["CBSE", "ICSE", "State Board"];

export const TARGET_GOALS = [
  "Engineering (JEE / CET)",
  "Medical (NEET)",
  "BCom / BBA / CUET",
  "CA / CS / CMA",
  "Law (CLAT)",
  "BSc / Research",
  "Not sure yet",
];

// Career Fit interest tags (Part C, not scored as right or wrong)
export const INTERESTS = {
  tech: { en: "Engineering & Technology", hi: "इंजीनियरिंग और टेक्नोलॉजी" },
  health: { en: "Medicine & Life Sciences", hi: "मेडिकल और लाइफ साइंसेज़" },
  business: { en: "Business, Finance & Commerce", hi: "बिज़नेस, फाइनेंस और कॉमर्स" },
  people: { en: "Law, Media & People-facing roles", hi: "लॉ, मीडिया और लोगों से जुड़े काम" },
} as const;
export type InterestTag = keyof typeof INTERESTS;

// Call booking (IST)
export const CALL = {
  daysAhead: 7,
  startHour: 10,
  endHour: 20, // last slot starts 30 min before this
  slotMin: 30,
  leadHours: 2, // earliest bookable slot from now
};

export function counsellorCapacity() {
  const n = Number(process.env.COUNSELLOR_CAPACITY || 2);
  return Number.isFinite(n) && n > 0 ? n : 2;
}
