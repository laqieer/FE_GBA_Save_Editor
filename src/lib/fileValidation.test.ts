import { describe, expect, it } from 'vitest'
import { isSupportedSaveFile } from './fileValidation'

describe('isSupportedSaveFile', () => {
  it('accepts .sav files only', () => {
    expect(isSupportedSaveFile('fe8.sav')).toBe(true)
    expect(isSupportedSaveFile('FE7.SAV')).toBe(true)
    expect(isSupportedSaveFile('save.srm')).toBe(false)
    expect(isSupportedSaveFile('payload.exe')).toBe(false)
    expect(isSupportedSaveFile('payload.com')).toBe(false)
  })
})
