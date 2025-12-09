const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function loadLeaderboardStore(filePath) {
  process.env.LEADERBOARD_FILE_PATH = filePath;
  delete require.cache[require.resolve('../services/leaderboardFileStore')];
  // eslint-disable-next-line global-require
  return require('../services/leaderboardFileStore');
}

test('reads leaderboard entries stored as a plain array', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leaderboard-store-'));
  const filePath = path.join(tempDir, 'leaderboard.json');
  const store = loadLeaderboardStore(filePath);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const payload = [
    { userId: '123', level: 5, totalHaulValue: 100 },
    { userId: '456', level: 3, totalHaulValue: 50 },
  ];

  await fs.promises.writeFile(filePath, JSON.stringify(payload), 'utf8');

  const entries = await store.readLeaderboardFileEntries();

  assert.strictEqual(entries.length, payload.length);
  assert.deepStrictEqual(entries.map(entry => entry.userId), ['123', '456']);
});

test('reads leaderboard entries stored under a "leaderboard" property', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leaderboard-store-'));
  const filePath = path.join(tempDir, 'leaderboard.json');
  const store = loadLeaderboardStore(filePath);

  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const payload = {
    leaderboard: [
      { userId: '789', level: 7, totalHaulValue: 200 },
      { userId: '012', level: 2, totalHaulValue: 25 },
    ],
  };

  await fs.promises.writeFile(filePath, JSON.stringify(payload), 'utf8');

  const entries = await store.readLeaderboardFileEntries();

  assert.strictEqual(entries.length, payload.leaderboard.length);
  assert.deepStrictEqual(entries.map(entry => entry.userId), ['789', '012']);
});
