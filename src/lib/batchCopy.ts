import type { ClassLevel } from "./config";
import type { BatchField } from "./batches";
import { t as tr, type Key } from "./i18n";
import type { Lang } from "./types";

export const BATCH_FEATURES: Key[] = ["pb_mentor", "pb_2", "pb_3", "pb_4", "pb_5", "pb_6", "pb_7", "pb_8"];
export const CARD_FEATURES: Key[] = ["pb_mentor", "pb_2", "pb_3", "pb_4", "pb_5", "pb_7"];

export const CLASS_COPY: Record<ClassLevel, { title: Key; tag: Key; focus: Key[] }> = {
  "10": { title: "c10_title", tag: "c10_tag", focus: ["c10_focus", "c10_focus2"] },
  "11": { title: "c11_title", tag: "c11_tag", focus: ["c11_focus"] },
  "12": { title: "c12_title", tag: "c12_tag", focus: ["c12_focus"] },
  dropper: { title: "cd_title", tag: "cd_tag", focus: ["cd_focus"] },
};

export function batchTitle(cls: ClassLevel, lang: Lang) {
  return tr(lang, CLASS_COPY[cls].title);
}

export function batchHref(cls: ClassLevel, field: BatchField) {
  return `/batch?cls=${cls}&field=${field}`;
}
