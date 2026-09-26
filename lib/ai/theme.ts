/**
 * Accent colors for the chat app, matching the skills-page palette in
 * components/SkillTag.tsx. Class strings are spelled out in full so Tailwind
 * can see them at build time.
 */

export const ACCENT_COLORS = [
  'blue',
  'green',
  'purple',
  'orange',
  'cyan',
  'pink',
  'yellow',
  'red',
  'gray',
] as const

export type AccentColor = (typeof ACCENT_COLORS)[number]

export const DEFAULT_ACCENT: AccentColor = 'blue'

export interface AccentClasses {
  /** User message bubble */
  bubble: string
  /** Primary buttons (send, save) */
  button: string
  /** Composer border while focused */
  ring: string
  /** Small tag/chip, same look as a skill tag */
  chip: string
  /** Solid swatch for pickers */
  swatch: string
  /** Text tint for "selected" states */
  text: string
}

export const ACCENTS: Record<AccentColor, AccentClasses> = {
  blue: {
    bubble: 'border-blue-500/30 bg-blue-500/20',
    button: 'bg-blue-600 active:bg-blue-500',
    ring: 'focus-within:border-blue-500',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    swatch: 'bg-blue-500',
    text: 'text-blue-300',
  },
  green: {
    bubble: 'border-green-500/30 bg-green-500/20',
    button: 'bg-green-600 active:bg-green-500',
    ring: 'focus-within:border-green-500',
    chip: 'bg-green-500/20 text-green-300 border-green-500/30',
    swatch: 'bg-green-500',
    text: 'text-green-300',
  },
  purple: {
    bubble: 'border-purple-500/30 bg-purple-500/20',
    button: 'bg-purple-600 active:bg-purple-500',
    ring: 'focus-within:border-purple-500',
    chip: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    swatch: 'bg-purple-500',
    text: 'text-purple-300',
  },
  orange: {
    bubble: 'border-orange-500/30 bg-orange-500/20',
    button: 'bg-orange-600 active:bg-orange-500',
    ring: 'focus-within:border-orange-500',
    chip: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    swatch: 'bg-orange-500',
    text: 'text-orange-300',
  },
  cyan: {
    bubble: 'border-cyan-500/30 bg-cyan-500/20',
    button: 'bg-cyan-600 active:bg-cyan-500',
    ring: 'focus-within:border-cyan-500',
    chip: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    swatch: 'bg-cyan-500',
    text: 'text-cyan-300',
  },
  pink: {
    bubble: 'border-pink-500/30 bg-pink-500/20',
    button: 'bg-pink-600 active:bg-pink-500',
    ring: 'focus-within:border-pink-500',
    chip: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    swatch: 'bg-pink-500',
    text: 'text-pink-300',
  },
  yellow: {
    bubble: 'border-yellow-500/30 bg-yellow-500/20',
    button: 'bg-yellow-600 active:bg-yellow-500',
    ring: 'focus-within:border-yellow-500',
    chip: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    swatch: 'bg-yellow-500',
    text: 'text-yellow-300',
  },
  red: {
    bubble: 'border-red-500/30 bg-red-500/20',
    button: 'bg-red-600 active:bg-red-500',
    ring: 'focus-within:border-red-500',
    chip: 'bg-red-500/20 text-red-300 border-red-500/30',
    swatch: 'bg-red-500',
    text: 'text-red-300',
  },
  gray: {
    bubble: 'border-gray-500/30 bg-gray-500/20',
    button: 'bg-gray-600 active:bg-gray-500',
    ring: 'focus-within:border-gray-500',
    chip: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    swatch: 'bg-gray-500',
    text: 'text-gray-300',
  },
}

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_COLORS as readonly string[]).includes(value)
}

/** localStorage key used to apply the choice instantly before the DB answers. */
export const ACCENT_STORAGE_KEY = 'ai-chat-accent'
