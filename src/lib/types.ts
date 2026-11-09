import type { ClassLevel, FieldId, InterestTag, Part, Stream } from "./config";
import type { BatchField } from "./batches";

export type Lang = "en" | "hi";

export interface Profile {
  name: string;
  cls: ClassLevel;
  stream: Stream;
  field: FieldId;
  school: string;
  city: string;
  board: string;
  targetGoal: string;
  language: Lang;
  email?: string;
  parentMobile?: string; // not collected any more (kept for old records)
  parentVerifiedAt?: string;
  consentAt: string;
}

export interface Enrollment {
  id: string;
  amount: number; // rupees, GST included
  paidAt: string;
  expiresAt?: string; // set only when admin removes the student from the batch
  mode: "demo" | "razorpay" | "admin"; // admin = added by hand from the admin panel
  paymentId?: string;
  cls?: ClassLevel;
  field?: BatchField; // a Track (jee, neet, boards_pcm, boards_pcb) for Class 12 Science
}

export interface User {
  id: string;
  mobile: string; // "" until the student fills it in onboarding
  email?: string; // login identity
  createdAt: string;
  activeSessionId: string;
  profile?: Profile;
  enrollments?: Enrollment[];
  testPurchases?: TestPurchase[]; // paid tests after the free ones
  masterclassSeats?: MasterclassSeat[];
  learn?: { done: Record<string, string>; plan?: PlanEdits }; // done: step id -> when it was marked done
  notifRead?: string[]; // ids of notifications this student has seen
  progressPct?: number; // saved roadmap progress (for admin lists)
  hasExpiredTest?: boolean; // an open test whose timer ran out (needs auto-submit); filled when the user is loaded
  behindSteps?: number;
}

/** Changes a mentor made to the automatic roadmap (for one student, or for a whole batch). */
export interface PlanEdits {
  endDate?: string; // YYYY-MM-DD: finish the syllabus by this day (default: 3 weeks before the exam)
  skip?: string[]; // chapter ids taken out of the roadmap
  moved?: Record<string, string>; // step id -> YYYY-MM-DD (one student only)
  weekGoals?: Record<string, string>; // Monday YYYY-MM-DD -> the mentor's goal for that week
  order?: string[]; // subject keys, first = gets its chapters earlier
  /** Which weeks students can see. Default: only past weeks and this week. */
  release?: { until?: string; all?: boolean }; // until = Monday YYYY-MM-DD of the last week shown
  /** Test syllabus and date per checkpoint number ("1", "2"...). Missing = automatic. */
  checkpoints?: Record<string, { chapters?: string[]; date?: string }>;
}

export type TaskKind = "topic" | "questions" | "revision" | "meet" | "other";

/** Something a mentor adds to the roadmap by hand: a topic, a set of questions, a meet... */
export interface MentorTask {
  id: string;
  target: { type: "student"; userId: string } | { type: "batch"; cls: ClassLevel; field: BatchField };
  kind: TaskKind;
  title: string;
  subject?: string; // SubjectKey
  date: string; // YYYY-MM-DD (IST)
  time?: string; // HH:MM, meets only
  minutes: number;
  note?: string;
  link?: string;
  questions?: { q: string; a?: string }[];
  createdAt: string;
}

/** Study material the team attaches to one syllabus chapter. Shown to every batch student who has that chapter. */
export interface ChapterContent {
  videos: { title: string; url: string }[]; // first one is the main (prescribed) video
  notes: { title: string; url: string }[]; // PDFs or notes links
  dpp: { pdf?: { title: string; url: string }; questions: { q: string; a?: string }[] };
  updatedAt: string;
}

/** Who an admin notification goes to. */
export type Audience =
  | { type: "all" }
  | { type: "class"; cls: ClassLevel }
  | { type: "batch"; cls?: ClassLevel; field?: BatchField } // students who joined a batch (optionally one class / stream)
  | { type: "student"; userId: string };

/** In-app notification sent from the admin panel. */
export interface Notice {
  id: string;
  title: string;
  body: string;
  link?: string;
  audience: Audience;
  recipients: number; // count when it was sent
  createdAt: string;
}

/** A question a batch student sends to a mentor. */
export interface Doubt {
  id: string;
  userId: string;
  subject: string; // SubjectKey from syllabus
  topic: string;
  status: "open" | "answered" | "resolved";
  messages: { from: "student" | "mentor"; by?: string; text: string; at: string }[];
  unreadForStudent: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A live class run by the team. Date and time are set by admin only. */
export interface Masterclass {
  id: string;
  cls: ClassLevel; // which batch it is for
  field?: FieldId; // which track inside the class (JEE, NEET, Commerce...). Empty = every student of that class
  title: string;
  desc: string;
  host?: string;
  startsAt: string; // ISO
  minutes: number;
  price: number;
  meetingLink?: string;
  calendarEventId?: string;
  status: "scheduled" | "cancelled";
  createdAt: string;
}

export interface MasterclassSeat {
  masterclassId: string;
  amount: number;
  paidAt: string;
  mode: "demo" | "razorpay" | "admin";
}

export interface TestPurchase {
  id: string;
  amount: number;
  paidAt: string;
  mode: "demo" | "razorpay" | "admin";
}

export interface Otp {
  key: string; // purpose:mobile
  hash: string;
  expiresAt: number;
  tries: number;
  sentAt: number;
}

export interface Option {
  id: string;
  en: string;
  hi?: string;
  tag?: InterestTag; // only for Career Fit questions
}

export interface Question {
  id: string;
  part: Part;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  skill: string;
  text: { en: string; hi?: string };
  options: Option[];
  answer: string | null; // option id. null for Career Fit
  explanation: string;
  active: boolean;
}

// What the browser receives. No answers, no explanations.
export interface PublicQuestion {
  id: string;
  part: Part;
  subject: string;
  text: { en: string; hi?: string };
  options: { id: string; en: string; hi?: string }[];
}

export interface SectionScore {
  key: string;
  correct: number;
  total: number;
  pct: number;
}

export interface Result {
  scoredTotal: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percentage: number;
  accuracy: number; // correct / attempted
  totalTimeSec: number;
  avgTimeSec: number;
  level: "Beginner" | "Developing" | "Strong" | "Advanced";
  parts: SectionScore[];
  subjects: SectionScore[];
  topics: (SectionScore & { subject: string })[];
  strong: string[];
  weak: string[];
  weakTopics: string[];
  interests: Partial<Record<InterestTag, number>>;
  topInterest?: InterestTag;
  streamRecommendation?: string; // Class 10 only
}

export interface Attempt {
  paid?: boolean; // true for a ₹49 test after the free ones
  checkpointNo?: number; // batch progress test (every 14 days); does not use a free attempt
  favSubject?: string; // PCM/PCB diagnostic: the subject the student picked (15 questions)
  id: string;
  userId: string;
  field: FieldId;
  cls: ClassLevel;
  attemptNo: number;
  questionIds: string[];
  optionOrder: Record<string, string[]>;
  startedAt: string;
  expiresAt: string;
  answers: Record<string, string>;
  marked: string[];
  timeSpent: Record<string, number>;
  lastSyncAt?: string;
  status: "in_progress" | "submitted";
  submittedAt?: string;
  autoSubmitted?: boolean;
  result?: Result;
}

export type CallPlatform = "meet" | "zoom";
export type BookingStatus = "booked" | "cancelled" | "attended" | "no_show";

export interface Booking {
  id: string;
  userId: string;
  attemptId?: string;
  slotStart: string; // ISO with +05:30
  platform: CallPlatform;
  status: BookingStatus;
  meetingLink?: string;
  linkSource?: "google" | "zoom" | "manual";
  calendarEventId?: string; // Google Calendar event on the team calendar
  zoomMeetingId?: string;
  remindersSent?: string[]; // "24h" | "1h" | "10m"
  syncError?: string; // last Google/Zoom error, shown in admin
  notes?: string;
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageKind = "otp" | "booked" | "link" | "reminder" | "cancelled";

export interface Message {
  id: string;
  at: string;
  to: string; // 10-digit mobile
  kind: MessageKind;
  text: string; // what the student sees (for the log; the provider uses the DLT template)
  channel?: "sms" | "whatsapp" | "email"; // missing = sms (older entries)
  status: "sent" | "failed" | "dev"; // dev = not sent, channel not configured
  provider?: string;
  error?: string;
  bookingId?: string;
}

export interface DB {
  users: User[];
  otps: Otp[];
  attempts: Attempt[];
  bookings: Booking[];
  questions: Question[];
  messages: Message[];
  masterclasses: Masterclass[];
  doubts: Doubt[];
  notifications: Notice[];
  tasks: MentorTask[];
  batchPlans: Record<string, PlanEdits>; // key "cls|field"
  chapterContent?: Record<string, ChapterContent>; // chapter id -> study material
  settings?: {
    mcSeed?: number; // version of the starter masterclasses
    google?: {
      refreshTokenEnc: string; // encrypted with AUTH_SECRET
      email?: string;
      connectedAt: string;
      error?: string; // e.g. access revoked; reconnect needed
    };
  };
}
