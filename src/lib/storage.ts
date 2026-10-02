import type { Character, Instructions, SavedPreset, StudioState } from '../types/studio'
import { blankCharacter, blankInstructions, blankTask } from './defaults'

const STORAGE_KEY = 'promptor_studio_v5'
const LEGACY_KEYS = [
  'promptor_studio_v4',
  'promptor_studio_v3',
  'promptor_studio_v2',
  'promptor_studio_v1',
]

function normalizeCharacter(raw: Partial<Character> | undefined): Character {
  return { ...blankCharacter(), ...(raw ?? {}) }
}

function normalizePreset(preset: SavedPreset): SavedPreset {
  return {
    ...preset,
    character: normalizeCharacter(preset.character),
    instructions: { ...blankInstructions(), ...preset.instructions },
    task: { ...blankTask(), ...preset.task },
  }
}

export function loadStudioState(): StudioState | null {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ??
      null
    if (!raw) return null
    const parsed = JSON.parse(raw) as StudioState
    if (!parsed.character || !parsed.instructions || !parsed.task) return null
    return {
      character: normalizeCharacter(parsed.character),
      instructions: { ...blankInstructions(), ...parsed.instructions },
      task: { ...blankTask(), ...parsed.task },
      savedPresets: Array.isArray(parsed.savedPresets)
        ? parsed.savedPresets.map(normalizePreset)
        : [],
    }
  } catch {
    return null
  }
}

export function saveStudioState(state: StudioState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportPresetJson(preset: SavedPreset): string {
  return JSON.stringify(preset, null, 2)
}

export function exportBundle(
  character: Character,
  instructions: Instructions,
  prompt: string,
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      character,
      instructions,
      prompt,
    },
    null,
    2,
  )
}

export function downloadText(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
