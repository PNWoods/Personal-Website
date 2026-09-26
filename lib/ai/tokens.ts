/** Rough tokenizer-free estimate; ~3.5 chars/token is conservative for code. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}
