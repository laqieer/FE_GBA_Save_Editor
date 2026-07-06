export function isSupportedSaveFile(fileName: string): boolean {
  return /\.(sav|sps)$/i.test(fileName)
}
