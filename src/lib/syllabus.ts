import type { ClassLevel } from "./config";
import type { BatchField } from "./batches";

/**
 * NCERT chapter lists used to build each batch student's roadmap.
 * Edit this file to change chapter order or names. Ids are stable: `${level}-${subject}-${index}`.
 */

type Level = "10" | "11" | "12";
export type SubjectKey = "physics" | "chemistry" | "maths" | "biology" | "science10" | "maths10" | "sst10" | "accounts" | "business" | "economics";

export const SUBJECT_NAME: Record<SubjectKey, { en: string; hi: string }> = {
  physics: { en: "Physics", hi: "फ़िज़िक्स" },
  chemistry: { en: "Chemistry", hi: "केमिस्ट्री" },
  maths: { en: "Mathematics", hi: "मैथ्स" },
  biology: { en: "Biology", hi: "बायोलॉजी" },
  science10: { en: "Science", hi: "साइंस" },
  maths10: { en: "Mathematics", hi: "मैथ्स" },
  sst10: { en: "Social Science", hi: "सोशल साइंस" },
  accounts: { en: "Accountancy", hi: "अकाउंटेंसी" },
  business: { en: "Business Studies", hi: "बिज़नेस स्टडीज़" },
  economics: { en: "Economics", hi: "इकोनॉमिक्स" },
};

const CH: Record<Level, Partial<Record<SubjectKey, string[]>>> = {
  "10": {
    science10: [
      "Chemical reactions and equations",
      "Acids, bases and salts",
      "Metals and non-metals",
      "Carbon and its compounds",
      "Life processes",
      "Control and coordination",
      "How do organisms reproduce?",
      "Heredity",
      "Light: reflection and refraction",
      "The human eye and the colourful world",
      "Electricity",
      "Magnetic effects of electric current",
      "Our environment",
    ],
    maths10: [
      "Real numbers",
      "Polynomials",
      "Pair of linear equations in two variables",
      "Quadratic equations",
      "Arithmetic progressions",
      "Triangles",
      "Coordinate geometry",
      "Introduction to trigonometry",
      "Some applications of trigonometry",
      "Circles",
      "Areas related to circles",
      "Surface areas and volumes",
      "Statistics",
      "Probability",
    ],
    sst10: [
      "The rise of nationalism in Europe",
      "Nationalism in India",
      "The making of a global world",
      "The age of industrialisation",
      "Print culture and the modern world",
      "Resources and development",
      "Forest and wildlife resources",
      "Water resources",
      "Agriculture",
      "Minerals and energy resources",
      "Manufacturing industries",
      "Lifelines of national economy",
      "Power sharing",
      "Federalism",
      "Gender, religion and caste",
      "Political parties",
      "Outcomes of democracy",
      "Development",
      "Sectors of the Indian economy",
      "Money and credit",
      "Globalisation and the Indian economy",
    ],
  },
  "11": {
    physics: [
      "Units and measurements",
      "Motion in a straight line",
      "Motion in a plane",
      "Laws of motion",
      "Work, energy and power",
      "System of particles and rotational motion",
      "Gravitation",
      "Mechanical properties of solids",
      "Mechanical properties of fluids",
      "Thermal properties of matter",
      "Thermodynamics",
      "Kinetic theory",
      "Oscillations",
      "Waves",
    ],
    chemistry: [
      "Some basic concepts of chemistry",
      "Structure of atom",
      "Classification of elements and periodicity",
      "Chemical bonding and molecular structure",
      "Thermodynamics",
      "Equilibrium",
      "Redox reactions",
      "Organic chemistry: basic principles and techniques",
      "Hydrocarbons",
    ],
    maths: [
      "Sets",
      "Relations and functions",
      "Trigonometric functions",
      "Complex numbers and quadratic equations",
      "Linear inequalities",
      "Permutations and combinations",
      "Binomial theorem",
      "Sequences and series",
      "Straight lines",
      "Conic sections",
      "Introduction to three dimensional geometry",
      "Limits and derivatives",
      "Statistics",
      "Probability",
    ],
    biology: [
      "The living world",
      "Biological classification",
      "Plant kingdom",
      "Animal kingdom",
      "Morphology of flowering plants",
      "Anatomy of flowering plants",
      "Structural organisation in animals",
      "Cell: the unit of life",
      "Biomolecules",
      "Cell cycle and cell division",
      "Photosynthesis in higher plants",
      "Respiration in plants",
      "Plant growth and development",
      "Breathing and exchange of gases",
      "Body fluids and circulation",
      "Excretory products and their elimination",
      "Locomotion and movement",
      "Neural control and coordination",
      "Chemical coordination and integration",
    ],
    accounts: [
      "Introduction to accounting",
      "Theory base of accounting",
      "Recording of transactions I",
      "Recording of transactions II",
      "Bank reconciliation statement",
      "Trial balance and rectification of errors",
      "Depreciation, provisions and reserves",
      "Financial statements I",
      "Financial statements II",
    ],
    business: [
      "Nature and purpose of business",
      "Forms of business organisation",
      "Public, private and global enterprises",
      "Business services",
      "Emerging modes of business",
      "Social responsibility of business and business ethics",
      "Sources of business finance",
      "Small business and entrepreneurship",
      "Internal trade",
      "International business",
    ],
    economics: [
      "Statistics: introduction",
      "Collection of data",
      "Organisation of data",
      "Presentation of data",
      "Measures of central tendency",
      "Correlation",
      "Index numbers",
      "Microeconomics: introduction",
      "Theory of consumer behaviour",
      "Production and costs",
      "The theory of the firm under perfect competition",
      "Market equilibrium",
    ],
  },
  "12": {
    physics: [
      "Electric charges and fields",
      "Electrostatic potential and capacitance",
      "Current electricity",
      "Moving charges and magnetism",
      "Magnetism and matter",
      "Electromagnetic induction",
      "Alternating current",
      "Electromagnetic waves",
      "Ray optics and optical instruments",
      "Wave optics",
      "Dual nature of radiation and matter",
      "Atoms",
      "Nuclei",
      "Semiconductor electronics",
    ],
    chemistry: [
      "Solutions",
      "Electrochemistry",
      "Chemical kinetics",
      "The d- and f-block elements",
      "Coordination compounds",
      "Haloalkanes and haloarenes",
      "Alcohols, phenols and ethers",
      "Aldehydes, ketones and carboxylic acids",
      "Amines",
      "Biomolecules",
    ],
    maths: [
      "Relations and functions",
      "Inverse trigonometric functions",
      "Matrices",
      "Determinants",
      "Continuity and differentiability",
      "Application of derivatives",
      "Integrals",
      "Application of integrals",
      "Differential equations",
      "Vector algebra",
      "Three dimensional geometry",
      "Linear programming",
      "Probability",
    ],
    biology: [
      "Sexual reproduction in flowering plants",
      "Human reproduction",
      "Reproductive health",
      "Principles of inheritance and variation",
      "Molecular basis of inheritance",
      "Evolution",
      "Human health and disease",
      "Microbes in human welfare",
      "Biotechnology: principles and processes",
      "Biotechnology and its applications",
      "Organisms and populations",
      "Ecosystem",
      "Biodiversity and conservation",
    ],
    accounts: [
      "Accounting for partnership: basic concepts",
      "Change in profit sharing ratio",
      "Admission of a partner",
      "Retirement and death of a partner",
      "Dissolution of partnership firm",
      "Accounting for share capital",
      "Issue and redemption of debentures",
      "Financial statements of a company",
      "Analysis of financial statements",
      "Accounting ratios",
      "Cash flow statement",
    ],
    business: [
      "Nature and significance of management",
      "Principles of management",
      "Business environment",
      "Planning",
      "Organising",
      "Staffing",
      "Directing",
      "Controlling",
      "Financial management",
      "Financial markets",
      "Marketing management",
      "Consumer protection",
    ],
    economics: [
      "National income accounting",
      "Money and banking",
      "Determination of income and employment",
      "Government budget and the economy",
      "Open economy macroeconomics",
      "Indian economy on the eve of independence",
      "Indian economy 1950 to 1990",
      "Liberalisation, privatisation and globalisation",
      "Human capital formation",
      "Rural development",
      "Employment: growth and informalisation",
      "Environment and sustainable development",
      "Comparative development: India and its neighbours",
    ],
  },
};

const FIELD_SUBJECTS: Record<BatchField, SubjectKey[]> = {
  foundation10: ["science10", "maths10", "sst10"],
  jee: ["physics", "chemistry", "maths"],
  neet: ["physics", "chemistry", "biology"],
  boards_pcm: ["physics", "chemistry", "maths"],
  boards_pcb: ["physics", "chemistry", "biology"],
  pcm: ["physics", "chemistry", "maths"],
  pcb: ["physics", "chemistry", "biology"],
  pcmb: ["physics", "chemistry", "maths", "biology"],
  commerce_maths: ["accounts", "business", "economics", "maths"],
  commerce_no_maths: ["accounts", "business", "economics"],
};

export type Chapter = { id: string; subject: SubjectKey; level: Level; title: string; order: number };

/**
 * Chapters for a batch, subject by subject. Droppers and the Class 12 JEE / NEET batches cover
 * Class 12 first, then Class 11 (both are in the entrance exam). Class 12 Boards: Class 12 only.
 */
export function chaptersFor(cls: ClassLevel, field: BatchField): Record<SubjectKey, Chapter[]> {
  const both = cls === "dropper" || field === "jee" || field === "neet";
  const levels: Level[] = both ? ["12", "11"] : cls === "10" ? ["10"] : cls === "11" ? ["11"] : ["12"];
  const out = {} as Record<SubjectKey, Chapter[]>;
  for (const subject of FIELD_SUBJECTS[field]) {
    out[subject] = levels.flatMap((level) =>
      (CH[level][subject] || []).map((title, i) => ({ id: `${level}-${subject}-${i + 1}`, subject, level, title, order: i })),
    );
  }
  return out;
}

/** Chapters of one class and subject (for the admin study-material page). */
export function chaptersOf(level: Level, subject: SubjectKey): Chapter[] {
  return (CH[level][subject] || []).map((title, i) => ({ id: `${level}-${subject}-${i + 1}`, subject, level, title, order: i }));
}

/** Subjects that have chapters in a class. */
export function subjectsOfLevel(level: Level): SubjectKey[] {
  return (Object.keys(CH[level]) as SubjectKey[]).filter((s) => (CH[level][s] || []).length > 0);
}

export function chapterById(id: string): Chapter | undefined {
  const [level, subject, n] = id.split("-");
  const title = CH[level as Level]?.[subject as SubjectKey]?.[Number(n) - 1];
  return title ? { id, subject: subject as SubjectKey, level: level as Level, title, order: Number(n) - 1 } : undefined;
}

export type { Level };

export function subjectsFor(field: BatchField) {
  return FIELD_SUBJECTS[field] || [];
}
