export function isSupportedSaveFile(fileName: string): boolean {
  return /\.sav$/i.test(fileName)
}
