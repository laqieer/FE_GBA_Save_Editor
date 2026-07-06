import { describe, expect, it } from 'vitest'
import { isSupportedSaveFile } from './fileValidation'

describe('isSupportedSaveFile', () => {
  it('accepts .sav and .sps files only', () => {
    expect(isSupportedSaveFile('fe8.sav')).toBe(true)
    expect(isSupportedSaveFile('fe8.sps')).toBe(true)
    expect(isSupportedSaveFile('FE7.SPS')).toBe(true)
    expect(isSupportedSaveFile('payload.exe')).toBe(false)
  })
})
