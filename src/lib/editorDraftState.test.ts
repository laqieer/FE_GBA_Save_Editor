import { describe, expect, it } from 'vitest'
import {
  reconcileDraftErrors,
  reconcileDraftValues,
} from './editorDraftState'

describe('editorDraftState', () => {
  it('preserves unrelated dirty drafts when canonical values change elsewhere', () => {
    const previousCanonical = {
      a: 'AA',
      b: 'BB',
    }
    const currentDrafts = {
      a: 'AA',
      b: 'CC',
    }
    const nextCanonical = {
      a: 'DD',
      b: 'BB',
    }

    expect(
      reconcileDraftValues(currentDrafts, previousCanonical, nextCanonical),
    ).toEqual({
      a: 'DD',
      b: 'CC',
    })
  })

  it('drops stale errors only for values whose canonical bytes changed', () => {
    const previousCanonical = {
      a: 'AA',
      b: 'BB',
    }
    const currentDrafts = {
      a: 'AA',
      b: 'CC',
    }
    const currentErrors = {
      a: 'error-a',
      b: 'error-b',
    }
    const nextCanonical = {
      a: 'DD',
      b: 'BB',
    }

    expect(
      reconcileDraftErrors(
        currentErrors,
        currentDrafts,
        previousCanonical,
        nextCanonical,
      ),
    ).toEqual({
      b: 'error-b',
    })
  })

  it('resets drafts and errors when the selected block changes', () => {
    const reconcileValues = reconcileDraftValues as (
      currentDrafts: Record<string, string>,
      previousCanonical: Record<string, string>,
      nextCanonical: Record<string, string>,
      preserveDirtyState: boolean,
    ) => Record<string, string>
    const reconcileErrors = reconcileDraftErrors as (
      currentErrors: Record<string, string>,
      currentDrafts: Record<string, string>,
      previousCanonical: Record<string, string>,
      nextCanonical: Record<string, string>,
      preserveDirtyState: boolean,
    ) => Record<string, string>
    const previousCanonical = {
      gold: '1234',
    }
    const currentDrafts = {
      gold: '9999',
    }
    const currentErrors = {
      gold: 'structuredEditor.outOfRange',
    }
    const nextCanonical = {
      gold: '1234',
    }

    expect(
      reconcileValues(
        currentDrafts,
        previousCanonical,
        nextCanonical,
        false,
      ),
    ).toEqual({
      gold: '1234',
    })
    expect(
      reconcileErrors(
        currentErrors,
        currentDrafts,
        previousCanonical,
        nextCanonical,
        false,
      ),
    ).toEqual({})
  })
})
