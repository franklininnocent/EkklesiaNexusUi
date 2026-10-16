/** Stable trackBy for entities with string or numeric `id`. */
export function trackByEntityId<T extends { id: string | number }>(
  _index: number,
  item: T
): string | number {
  return item.id;
}

export function trackByIndex(index: number): number {
  return index;
}
