const GROUP_LENGTH = 3;
const CODE_LENGTH = GROUP_LENGTH * 2;

/** Formatiert die Eingabe beim Tippen: Großbuchstaben, Bindestrich nach drei Zeichen – "k7qx" → "K7Q-X". */
export function formatJoinCodeInput(typed: string): string {
  const compact = typed
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, CODE_LENGTH);
  return compact.length > GROUP_LENGTH
    ? `${compact.slice(0, GROUP_LENGTH)}-${compact.slice(GROUP_LENGTH)}`
    : compact;
}

export function isCompleteJoinCode(code: string): boolean {
  return code.replace('-', '').length === CODE_LENGTH;
}
