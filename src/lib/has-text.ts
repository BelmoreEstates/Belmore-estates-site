import { textOf } from "@/components/site/text";

/** True when a key has visible text (Round 7 slots default to "", so they stay hidden until filled). */
export function hasText(blocks: Record<string, string>, k: string) {
  return textOf(blocks, k).trim() !== "";
}
