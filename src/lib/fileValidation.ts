export const KNOWN_SAVE_EXTENSIONS = ['.sav', '.sps'] as const

export function isSupportedSaveFile(fileName: string): boolean {
  // match any known extension case-insensitively
  return new RegExp(`(${KNOWN_SAVE_EXTENSIONS.map((e) => e.replace('.', '\\.') ).join('|')})$`, 'i').test(fileName)
}
