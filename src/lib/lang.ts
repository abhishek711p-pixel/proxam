import "server-only";
import { cookies } from "next/headers";
import type { Lang } from "./types";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "hi" ? "hi" : "en";
}
