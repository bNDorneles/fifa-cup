import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { emptyStore } from '../shared/types.js';
import { getStore, resetRepoClient, setStore, RevisionConflictError } from './repo.js';

describe('repo libsql file', () => {
  const prevUrl = process.env.TURSO_DATABASE_URL;
  const prevToken = process.env.TURSO_AUTH_TOKEN;
  let tmpDir = '';

  afterEach(() => {
    resetRepoClient();
    if (prevUrl === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = prevUrl;
    if (prevToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
    else process.env.TURSO_AUTH_TOKEN = prevToken;
    // libsql may keep the file locked on Windows — ignore cleanup errors
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it('persists and enforces revision', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fifa-repo-'));
    const dbPath = path.join(tmpDir, 't.db').replace(/\\/g, '/');
    process.env.TURSO_DATABASE_URL = `file:${dbPath}`;
    delete process.env.TURSO_AUTH_TOKEN;
    resetRepoClient();

    const initial = await getStore();
    expect(initial.players).toEqual([]);

    const withPlayer = {
      ...emptyStore(),
      revision: initial.revision,
      players: [{ id: 'p1', name: 'Ana' }],
    };
    const saved = await setStore(withPlayer);
    expect(saved.players).toHaveLength(1);
    expect(saved.revision).toBe(initial.revision + 1);

    await expect(
      setStore({ ...saved, revision: saved.revision - 1, players: [] }),
    ).rejects.toBeInstanceOf(RevisionConflictError);
  });
});
