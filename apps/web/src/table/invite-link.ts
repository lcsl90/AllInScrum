/** Der direkte Link an den Tisch – Code und Link sind gleichwertig. */
export function inviteLink(joinCode: string): string {
  return `${window.location.origin}/s/${joinCode}`;
}
