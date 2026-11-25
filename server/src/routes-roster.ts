/**
 * Roster actions and the portable team card.
 * Mounted beside the main API so this fork can add them without rewriting routes.ts.
 */
import { Hono } from 'hono';
import { db, now } from './db.js';
import { newId } from './lib/ids.js';
import { hub } from './lib/hub.js';
import { requireUser, type AuthVars } from './lib/auth.js';
import { getBot, getBotRow } from './store.js';
import { exportTeamMarkdown, importTeamMarkdown } from './team-pack.js';
import type { AvatarColor, AvatarShape } from './types.js';

export const rosterApi = new Hono<AuthVars>();
rosterApi.use('*', requireUser);

const SHAPES: AvatarShape[] = ['blob', 'pebble', 'bean', 'egg', 'squircle', 'tablet', 'capsule', 'cylinder', 'hex', 'gem', 'crystal', 'wedge', 'shield', 'dome', 'arch', 'cloud', 'teardrop', 'leaf', 'square', 'sparkle', 'clover', 'flower', 'heart', 'house', 'star'];
const COLORS: AvatarColor[] = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet', 'magenta', 'gray'];

function hashPick<T>(id: string, list: T[]): T {
  let h = 0x811c9dc5;
  for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return list[h % list.length];
}

function createBot(userId: string, b: { name: string; label?: string; description?: string; instructions?: string; avatarShape?: string; avatarColor?: string; mode?: string; isPrimary?: boolean }) {
  const id = newId('bot');
  const shape = SHAPES.includes(b.avatarShape as AvatarShape) ? b.avatarShape : hashPick(id, SHAPES.slice(0, 13));
  const color = COLORS.includes(b.avatarColor as AvatarColor) ? b.avatarColor : hashPick(id, COLORS.filter((c) => c !== 'black'));
  db.prepare(
    'INSERT INTO bots(id,user_id,name,label,description,instructions,avatar_shape,avatar_color,mode,is_primary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
  ).run(id, userId, b.name.trim().slice(0, 60) || 'New Bot', b.label ?? '', b.description ?? '', b.instructions ?? '', shape, color, b.mode === 'teammate' ? 'teammate' : 'personal', b.isPrimary ? 1 : 0, now(), now());
  hub.emit(userId, { type: 'roster' });
  return getBot(id)!;
}

const ownBot = (userId: string, id: string) => {
  const b = getBotRow(id);
  return b && b.user_id === userId ? b : null;
};

rosterApi.post('/bots/:id/duplicate', (c) => {
  const user = c.get('user');
  const b = ownBot(user.id, c.req.param('id'));
  if (!b) return c.json({ error: 'not found' }, 404);
  if (b.kind === 'room') return c.json({ error: 'duplicate a bot, not a group chat' }, 400);
  const copy = createBot(user.id, {
    name: `${b.name} copy`.slice(0, 60),
    label: b.label,
    description: b.description,
    instructions: b.instructions,
    avatarShape: b.avatar_shape,
    avatarColor: b.avatar_color,
    mode: b.mode,
    isPrimary: false,
  });
  db.prepare('UPDATE bots SET effort=?, voice=?, voice_speed=?, voice_language=? WHERE id=?').run(
    b.effort ?? 'medium', b.voice ?? 'luna', b.voice_speed ?? 1, b.voice_language ?? 'auto', copy.id,
  );
  const skills = db.prepare('SELECT name, body FROM skills WHERE bot_id=?').all(b.id) as { name: string; body: string }[];
  for (const s of skills) db.prepare('INSERT INTO skills(id,bot_id,name,body,created_at) VALUES (?,?,?,?,?)').run(newId('skl'), copy.id, s.name, s.body, now());
  return c.json({ bot: getBot(copy.id) });
});

rosterApi.post('/bots/:id/hide', (c) => {
  const user = c.get('user');
  const b = ownBot(user.id, c.req.param('id'));
  if (!b) return c.json({ error: 'not found' }, 404);
  if (b.is_primary) return c.json({ error: 'the primary bot stays on the roster' }, 400);
  db.prepare('UPDATE bots SET hidden=1, pinned=0, updated_at=? WHERE id=?').run(now(), b.id);
  hub.emit(user.id, { type: 'roster' });
  return c.json({ ok: true });
});

rosterApi.get('/team', (c) => c.json({ markdown: exportTeamMarkdown(c.get('user').id) }));

rosterApi.post('/team/import', async (c) => {
  const user = c.get('user');
  const { markdown } = await c.req.json<{ markdown?: string }>();
  if (!markdown?.trim()) return c.json({ error: 'paste a team card' }, 400);
  try {
    const result = importTeamMarkdown(user.id, markdown, (b) => createBot(user.id, b));
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'could not import' }, 400);
  }
});
