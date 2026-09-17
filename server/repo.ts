import { createClient, type Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { emptyStore, normalizeStore, type Store } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const LEGACY_JSON = path.join(DATA_DIR, 'store.json');
const LOCAL_DB = path.join(DATA_DIR, 'local.db');

let clientPromise: Promise<Client> | null = null;

function resolveDbConfig(): { url: string; authToken?: string } {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (url) {
    return { url, authToken };
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const fileUrl = `file:${LOCAL_DB.replace(/\\/g, '/')}`;
  return { url: fileUrl };
}

async function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const cfg = resolveDbConfig();
      const client = createClient(cfg);
      await client.execute(`
        CREATE TABLE IF NOT EXISTS app_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      return client;
    })();
  }
  return clientPromise;
}

async function readRaw(): Promise<Store | null> {
  const client = await getClient();
  const result = await client.execute('SELECT payload FROM app_state WHERE id = 1');
  const row = result.rows[0];
  if (!row) return null;
  return normalizeStore(JSON.parse(String(row.payload)));
}

async function writeRaw(store: Store): Promise<void> {
  const client = await getClient();
  const updatedAt = new Date().toISOString();
  await client.execute({
    sql: `
      INSERT INTO app_state (id, payload, updated_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `,
    args: [JSON.stringify(store), updatedAt],
  });
}

export async function getStore(): Promise<Store> {
  const existing = await readRaw();
  if (existing) return existing;

  if (fs.existsSync(LEGACY_JSON)) {
    try {
      const raw = JSON.parse(fs.readFileSync(LEGACY_JSON, 'utf-8'));
      const migrated = normalizeStore(raw);
      await writeRaw(migrated);
      return migrated;
    } catch {
      /* fall through */
    }
  }

  const initial = emptyStore();
  await writeRaw(initial);
  return initial;
}

export class RevisionConflictError extends Error {
  constructor() {
    super('Conflito de revisão — recarregue e tente de novo');
    this.name = 'RevisionConflictError';
  }
}

export async function setStore(
  store: Store,
  opts: { force?: boolean; expectedRevision?: number } = {},
): Promise<Store> {
  const current = await readRaw();
  const currentRevision = current?.revision ?? 0;

  if (!opts.force) {
    const expected = opts.expectedRevision ?? store.revision ?? 0;
    if (expected !== currentRevision) {
      throw new RevisionConflictError();
    }
  }

  const next: Store = {
    ...normalizeStore(store),
    revision: currentRevision + 1,
  };

  await writeRaw(next);
  return next;
}

export function resetRepoClient(): void {
  clientPromise = null;
}
