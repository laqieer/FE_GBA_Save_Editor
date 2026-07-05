type DraftMap<TKey extends string | number> = Record<TKey, string>

export function reconcileDraftValues<TKey extends string | number>(
  currentDrafts: DraftMap<TKey>,
  previousCanonical: DraftMap<TKey>,
  nextCanonical: DraftMap<TKey>,
  preserveDirtyState = true,
): DraftMap<TKey> {
  const nextDrafts = {} as DraftMap<TKey>

  for (const key of Object.keys(nextCanonical) as TKey[]) {
    const previousValue = previousCanonical[key]
    const nextValue = nextCanonical[key]
    const currentDraft = currentDrafts[key]
    const isDirty = key in currentDrafts && currentDraft !== previousValue

    nextDrafts[key] = preserveDirtyState && isDirty && previousValue === nextValue
      ? currentDraft
      : nextValue
  }

  return nextDrafts
}

export function reconcileDraftErrors<TKey extends string | number>(
  currentErrors: DraftMap<TKey>,
  currentDrafts: DraftMap<TKey>,
  previousCanonical: DraftMap<TKey>,
  nextCanonical: DraftMap<TKey>,
  preserveDirtyState = true,
): DraftMap<TKey> {
  const nextErrors = {} as DraftMap<TKey>

  for (const key of Object.keys(nextCanonical) as TKey[]) {
    const previousValue = previousCanonical[key]
    const nextValue = nextCanonical[key]
    const currentDraft = currentDrafts[key]
    const isDirty = key in currentDrafts && currentDraft !== previousValue

    if (preserveDirtyState && isDirty && previousValue === nextValue && currentErrors[key]) {
      nextErrors[key] = currentErrors[key]
    }
  }

  return nextErrors
}
