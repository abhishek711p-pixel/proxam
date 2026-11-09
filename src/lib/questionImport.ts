import "server-only";
import { parseCSV } from "./csv";
import { newId } from "./ids";
import { INTERESTS, type InterestTag, type Part } from "./config";
import type { Question } from "./types";

export const CSV_HEADERS = [
  "subject", "part", "chapter", "topic", "difficulty", "skill", "question_en", "question_hi",
  "a", "b", "c", "d", "a_hi", "b_hi", "c_hi", "d_hi", "answer", "explanation", "tags",
];

export function importQuestions(text: string): { questions: Question[]; errors: string[] } {
  const rows = parseCSV(text);
  const errors: string[] = [];
  const questions: Question[] = [];
  if (rows.length < 2) return { questions, errors: ["The file has no data rows."] };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const missing = CSV_HEADERS.filter((h) => !head.includes(h));
  if (missing.length) return { questions, errors: [`Missing columns: ${missing.join(", ")}`] };
  const col = (r: string[], h: string) => (r[head.indexOf(h)] || "").trim();

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const part = col(r, "part").toUpperCase() as Part;
    const subject = col(r, "subject");
    const text = col(r, "question_en");
    const opts = (["a", "b", "c", "d"] as const).map((k) => ({ id: k, en: col(r, k), hi: col(r, `${k}_hi`) || undefined })).filter((o) => o.en);
    const answer = col(r, "answer").toLowerCase();
    const difficulty = (col(r, "difficulty").toLowerCase() || "medium") as Question["difficulty"];

    if (!subject || !text) return errors.push(`Row ${line}: subject and question_en are required.`);
    if (!["A", "B", "C"].includes(part)) return errors.push(`Row ${line}: part must be A, B or C.`);
    if (opts.length < 2) return errors.push(`Row ${line}: at least 2 options needed.`);
    if (!["easy", "medium", "hard"].includes(difficulty)) return errors.push(`Row ${line}: difficulty must be easy, medium or hard.`);

    let tags: (InterestTag | undefined)[] = [];
    if (part === "C") {
      tags = col(r, "tags").split("|").map((x) => x.trim() as InterestTag);
      if (tags.length < opts.length || tags.some((x) => x && !(x in INTERESTS)))
        return errors.push(`Row ${line}: Part C needs tags like tech|health|business|people (one per option).`);
    } else if (!opts.some((o) => o.id === answer)) {
      return errors.push(`Row ${line}: answer must be the letter of one option (a, b, c or d).`);
    }

    questions.push({
      id: newId("q_"),
      part,
      subject,
      chapter: col(r, "chapter") || "General",
      topic: col(r, "topic") || "General",
      difficulty,
      skill: col(r, "skill") || "conceptual",
      text: { en: text, hi: col(r, "question_hi") || undefined },
      options: opts.map((o, j) => ({ ...o, tag: part === "C" ? tags[j] : undefined })),
      answer: part === "C" ? null : answer,
      explanation: col(r, "explanation"),
      active: true,
    });
  });
  return { questions, errors };
}
