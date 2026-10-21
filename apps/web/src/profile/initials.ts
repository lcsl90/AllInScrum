/** Erster Buchstabe des ersten und des letzten Wortes – "Anna Maria Schmidt" → "AS". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words.at(0);
  const last = words.length > 1 ? words.at(-1) : undefined;
  if (!first) return '?';
  return [first, last]
    .filter((word): word is string => word !== undefined)
    .map((word) => firstGrapheme(word).toLocaleUpperCase('de'))
    .join('');
}

function firstGrapheme(word: string): string {
  return Array.from(word)[0] ?? '';
}
