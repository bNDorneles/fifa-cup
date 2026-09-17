const base = 'http://localhost:3001';

async function main() {
  const health = await fetch(`${base}/api/health`);
  console.log('health', await health.json());

  const me1 = await fetch(`${base}/api/me`);
  console.log('me before', await me1.json());

  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'admin' }),
  });
  const setCookie = login.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ') ||
    (login.headers.get('set-cookie') || '').split(',').map((c) => c.split(';')[0].trim()).filter((c) => c.includes('=')).join('; ');
  console.log('login', login.status, await login.json(), 'cookie?', Boolean(cookie));

  const me2 = await fetch(`${base}/api/me`, { headers: { cookie } });
  console.log('me after', await me2.json());

  const putNoAuth = await fetch(`${base}/api/store`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: 1,
      revision: 0,
      players: [],
      tournaments: [],
      activeTournamentId: null,
    }),
  });
  console.log('put no auth', putNoAuth.status, await putNoAuth.json());

  const current = await (await fetch(`${base}/api/store`)).json();
  const putAuth = await fetch(`${base}/api/store`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      ...current,
      players: [{ id: 'p_smoke', name: 'Smoke' }],
    }),
  });
  console.log('put auth', putAuth.status, await putAuth.json());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
