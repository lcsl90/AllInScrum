/** Namen auf s, ß, x oder z bekommen im Genitiv nur einen Apostroph: "Klaus' Runde". */
const ENDS_WITH_S_SOUND = /[sßxz]$/i;

export function defaultSessionName(playerName: string): string {
  const name = playerName.trim();
  const genitive = ENDS_WITH_S_SOUND.test(name) ? `${name}'` : `${name}s`;
  return `${genitive} Runde`;
}
