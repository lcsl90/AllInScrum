import { type BrowserContext, test as base, type Locator, type Page } from '@playwright/test';

export { expect } from '@playwright/test';

/** Ein Teammitglied mit eigenem Browser – eigene Cookies, eigener Speicher, eigener Platz am Tisch. */
export interface Player {
  readonly page: Page;
  /** Die eigenen Handkarten. */
  readonly hand: Locator;
}

interface PlayerFixtures {
  /** Eröffnet als `name` einen neuen Tisch. */
  openTable(name: string): Promise<Player & { readonly joinCode: string }>;
  /** Setzt `name` über den Einladungslink an den Tisch. */
  joinTable(joinCode: string, name: string): Promise<Player>;
}

export const test = base.extend<PlayerFixtures & { newPlayerPage: () => Promise<Page> }>({
  newPlayerPage: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async () => {
      // Bewegung reduzieren: Die App überspringt dann ihre Animationen – stabilere Tests.
      const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },

  openTable: async ({ newPlayerPage }, use) => {
    await use(async (name) => {
      const page = await newPlayerPage();
      await page.goto('/');
      await page.getByLabel('Dein Name').fill(name);
      await page.getByRole('button', { name: 'Session erstellen' }).click();
      await page.getByRole('button', { name: 'Tisch eröffnen' }).click();
      await page.waitForURL(/\/s\/[A-Z0-9]{3}-[A-Z0-9]{3}$/);
      const joinCode = new URL(page.url()).pathname.split('/').at(-1) ?? '';
      return { page, hand: handOf(page), joinCode };
    });
  },

  joinTable: async ({ newPlayerPage }, use) => {
    await use(async (joinCode, name) => {
      const page = await newPlayerPage();
      await page.goto(`/s/${joinCode}`);
      await page.getByLabel('Dein Name').fill(name);
      await page.getByRole('button', { name: 'Platz nehmen' }).click();
      await page.getByRole('button', { name: 'Tisch verlassen' }).waitFor();
      return { page, hand: handOf(page) };
    });
  },
});

function handOf(page: Page): Locator {
  return page.getByRole('group', { name: 'Deine Karten' });
}
