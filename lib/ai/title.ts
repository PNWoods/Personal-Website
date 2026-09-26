const MAX_TITLE_LENGTH = 60

/** Derive a conversation title from the first user message. */
export function autoTitle(text: string) {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (!collapsed) return 'New chat'
  if (collapsed.length <= MAX_TITLE_LENGTH) return collapsed
  return collapsed.slice(0, MAX_TITLE_LENGTH).trimEnd() + '…'
}
