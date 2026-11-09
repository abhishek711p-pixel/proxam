import type { FieldId } from "./config";

// Search landing pages: one per thing students actually search for.
// Each one is a real guide (pattern, syllabus, what the result shows, FAQs), not a copy of the home page.
// Add a guide here, then add a folder in src/app with the same slug (copy an existing one).

export type Guide = {
  slug: string;
  navLabel: string; // short link text in footers
  title: string; // <title> and search result headline (keep under 60 characters)
  description: string; // search result snippet (keep under 160 characters)
  h1: string;
  intro: string[];
  fields: FieldId[]; // test blueprints shown on the page
  levels: ("10" | "11" | "12")[]; // syllabus shown on the page
  forWho: string[];
  honest: string; // what the test is not
  faqs: [string, string][];
};

export const GUIDES: Guide[] = [
  {
    slug: "free-jee-practice-test",
    navLabel: "Free JEE practice test (PCM)",
    title: "Free JEE Practice Test Online for Class 11, 12 (PCM)",
    description:
      "Free 35-question PCM test with instant topic-wise result. Pick your favourite subject, find weak chapters before JEE Main. For Class 11, 12 and droppers.",
    h1: "Free JEE practice test for Class 11, 12 and droppers (PCM)",
    intro: [
      "Most JEE aspirants find out which chapters are weak only after a bad mock test. This free test shows it on day one: 35 MCQs from Physics, Chemistry and Mathematics, a timer, and a result the moment you submit.",
      "Before you start, you pick your favourite subject. That subject gets 15 questions and the other two get 10 each, so the result tells you how strong your best subject really is, and how far behind the other two are.",
    ],
    fields: ["pcm"],
    levels: ["11", "12"],
    forWho: [
      "Class 11 students starting JEE preparation",
      "Class 12 students balancing boards and JEE Main",
      "Droppers restarting preparation and wanting an honest baseline",
      "Students choosing between JEE and state CETs",
    ],
    honest:
      "This is a diagnostic test, not a full JEE Main mock (that has 75 questions in 3 hours). Use it to find your weak chapters first, then practise full-length mocks.",
    faqs: [
      ["Is this JEE practice test really free?", "Yes. The test, the result and a guidance call are free. You get 3 free attempts with different questions. Extra tests cost ₹49."],
      ["How many questions are there and how long is it?", "35 MCQs in 45 minutes. Your favourite subject gets 15 questions, the other two get 10 each. There is no negative marking."],
      ["Can droppers take it?", "Yes. Pick Dropper as your class. The questions and your study roadmap then cover both Class 11 and Class 12 chapters."],
      ["What do I get after the test?", "Your score, subject-wise and topic-wise marks, your weak topics, time spent per question and a realistic next step. You can also book a free call with a counsellor."],
      ["Can I take it in Hindi?", "Yes. The whole site works in Hindi and English. Switch the language from the top of any page."],
    ],
  },
  {
    slug: "free-neet-practice-test",
    navLabel: "Free NEET practice test (PCB)",
    title: "Free NEET Practice Test Online for Class 11, 12 (PCB)",
    description:
      "Free 35-question Physics, Chemistry, Biology test with instant result and weak-chapter list. For NEET aspirants in Class 11, 12 and droppers.",
    h1: "Free NEET practice test for Class 11, 12 and droppers (PCB)",
    intro: [
      "NEET rewards the student who knows exactly which chapters cost marks. This free test gives you 35 MCQs from Physics, Chemistry and Biology, with a timer, and shows your weak chapters the moment you submit.",
      "You choose your favourite subject before starting. It gets 15 questions and the other two get 10 each. For most NEET students the surprise is Physics, and the result shows it in plain numbers.",
    ],
    fields: ["pcb"],
    levels: ["11", "12"],
    forWho: [
      "Class 11 students starting NEET preparation",
      "Class 12 students preparing for boards and NEET together",
      "NEET droppers who want a clear starting point",
      "Students deciding between NEET and other medical or biotech courses",
    ],
    honest:
      "This is a diagnostic test, not a full NEET mock (that has 180 questions in 3 hours 20 minutes). Use it to see where you stand, then build up to full-length papers.",
    faqs: [
      ["Is this NEET practice test free?", "Yes. The test, the instant result and one guidance call are free. You get 3 free attempts with different questions."],
      ["What is the test pattern?", "35 MCQs in 45 minutes: 15 from the subject you pick as favourite and 10 each from the other two. No negative marking."],
      ["Does it follow the NCERT syllabus?", "Yes. Questions and the study roadmap follow the NCERT Class 11 and 12 chapters listed on this page."],
      ["I am a dropper. Is this useful for me?", "Yes. Pick Dropper as your class. Your result and roadmap then cover both years of the syllabus."],
      ["Is PCMB also available?", "Yes. PCMB students get 8 questions per subject plus 3 career questions, 35 in total."],
    ],
  },
  {
    slug: "class-10-stream-selection-test",
    navLabel: "Class 10 stream selection test",
    title: "Class 10 Stream Selection Test: Science or Commerce?",
    description:
      "Free 30-question test for Class 10: Maths, Physics, Chemistry, Biology, Social Studies and career interest. Get a stream suggestion (PCM, PCB, Commerce) instantly.",
    h1: "Science or Commerce after Class 10? Take the free stream selection test",
    intro: [
      "Choosing a stream after Class 10 is usually decided by marks, friends or relatives. This free test adds two things that matter more: how you actually do in each subject, and what kind of work you enjoy.",
      "It has 30 questions: 5 each from Maths, Physics, Chemistry, Biology and Social Studies (History and Geography), and 5 career-interest questions with no right or wrong answer. At the end you get a suggested stream: PCM, PCB, PCMB, Commerce with Maths or Commerce without Maths.",
    ],
    fields: ["foundation10"],
    levels: ["10"],
    forWho: [
      "Class 10 students unsure between Science and Commerce",
      "Students who like Biology but are not sure about Maths (or the other way round)",
      "Parents who want an unbiased starting point for the stream talk",
      "Class 9 students planning ahead",
    ],
    honest:
      "The stream suggestion is a starting point for a conversation, not a final verdict. Talk it through with a counsellor (the call is free) before you decide.",
    faqs: [
      ["How does the test suggest a stream?", "It combines your marks in Maths, Physics, Chemistry and Biology with your career-interest answers. For example, strong Maths and Physics plus an interest in technology points to PCM."],
      ["Is the stream selection test free?", "Yes, including the result and one guidance call with a counsellor."],
      ["How long does it take?", "30 questions in 35 minutes. There is no negative marking."],
      ["Does it include Social Science?", "Yes. 5 questions cover History and Geography from the Class 10 NCERT books."],
      ["Can my parents see the result?", "Yes. You can share or print the result page, and parents can join the guidance call."],
    ],
  },
  {
    slug: "commerce-test-class-11-12",
    navLabel: "Free Commerce test (Class 11, 12)",
    title: "Free Commerce Test for Class 11, 12: Accounts, BST, Eco",
    description:
      "Free 30-question Commerce test with or without Maths: Accountancy, Business Studies, Economics. Instant result for CUET, CA Foundation and board prep.",
    h1: "Free Commerce test for Class 11 and 12 (with or without Maths)",
    intro: [
      "Commerce students rarely get a proper diagnostic test. This one has 30 questions, all from your own subjects: Accountancy, Business Studies and Economics, plus Applied or core Mathematics if you study it.",
      "Your result shows which chapters are costing you marks, whether that is depreciation, partnership accounts, national income or elasticity, so you know what to fix before boards, CUET or CA Foundation.",
    ],
    fields: ["commerce_maths", "commerce_no_maths"],
    levels: ["11", "12"],
    forWho: [
      "Class 11 and 12 Commerce students preparing for boards",
      "Students aiming for CUET (BCom, BBA, Economics Hons)",
      "Students planning CA, CS or CMA Foundation",
      "Commerce droppers preparing for CUET again",
    ],
    honest:
      "This is a short diagnostic, not a full CUET or CA Foundation paper. It tells you where to focus; full papers come after.",
    faqs: [
      ["What is the pattern for Commerce with Maths?", "30 questions in 40 minutes: Accountancy 8, Business Studies 7, Economics 8 and Mathematics 7."],
      ["What about Commerce without Maths?", "30 questions in 40 minutes: 10 each from Accountancy, Business Studies and Economics."],
      ["Is it useful for CUET?", "Yes, as a first check. CUET domain papers for Accountancy, Business Studies and Economics follow the same NCERT chapters."],
      ["Is the test free?", "Yes. The test, result and one guidance call are free, with 3 free attempts."],
      ["Can I take it in Hindi?", "Yes. Switch to Hindi from the top of the page."],
    ],
  },
];

export function guideBySlug(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
