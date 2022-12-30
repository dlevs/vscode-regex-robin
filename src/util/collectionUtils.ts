/**
 * Like lodash's `groupBy` function, but accepts non-strings
 * as the key parameter.
 */
export function groupByMap<Key, Item>(
  collection: Iterable<Item>,
  getKey: (item: Item) => Key
) {
  const grouped = new Map<Key, Item[]>();

  for (const item of collection) {
    const key = getKey(item);

    if (grouped.has(key)) {
      grouped.get(key)?.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
}
