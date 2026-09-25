import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

export async function applyMigrations(client: PGlite): Promise<void> {
  const directory = new URL('../db/migrations/', import.meta.url);
  const names = (await readdir(directory)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
  for (const name of names) {
    await client.exec(await readFile(new URL(name, directory), 'utf8'));
  }
}
