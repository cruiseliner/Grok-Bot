/**
 * Portable crew card.
 * Inspired by the idea of a shareable team file (no chats, memories, keys, or computers).
 * The format and parser are original to this fork. Nothing here is copied from another project.
 */
import { db, now } from './db.js';
import { newId } from './lib/ids.js';
import type { AvatarColor, AvatarShape } from './types.js';

const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh']);
const SHAPES = new Set(['blob', 'pebble', 'bean', 'egg', 'squircle', 'tablet', 'capsule', 'cylinder', 'hex', 'gem', 'crystal', 'wedge', 'shield', 'dome', 'arch', 'cloud', 'teardrop', 'leaf', 'square', 'sparkle', 'clover', 'flower', 'heart', 'house', 'star']);
const COLORS = new Set(['black', 'brown', 'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'violet', 'magenta', 'gray']);

export interface TeamDraft {
  name: string;
  label: string;
  instructions: string;
  mode: 'personal' | 'teammate';
  effort: 'low' | 'medium' | 'high' | 'xhigh';
  avatarShape?: AvatarShape;
  avatarColor?: AvatarColor;
  primary: boolean;
  skills: string[];
}

export function exportTeamMarkdown(userId: string): string {
  const bots = db.prepare(
    "SELECT * FROM bots WHERE user_id=? AND COALESCE(hidden,0)=0 AND COALESCE(kind,'agent')<>'room' ORDER BY is_primary DESC, name COLLATE NOCASE",
  ).all(userId) as any[];
  const lines = [
    '# Team',
    '',
    'A portable crew card. It has names, jobs, and instructions only.',
    'It does not include chats, memories, API keys, app logins, or computer access.',
    '',
  ];
  for (const b of bots) {
    const skills = db.prepare('SELECT name FROM skills WHERE bot_id=? ORDER BY name').all(b.id) as { name: string }[];
    lines.push(`## ${String(b.name).replace(/\r?\n/g, ' ').trim()}`);
    lines.push(`role: ${String(b.label ?? '').replace(/\r?\n/g, ' ')}`);
    lines.push(`mode: ${b.mode === 'teammate' ? 'teammate' : 'personal'}`);
    lines.push(`effort: ${EFFORTS.has(b.effort) ? b.effort : 'medium'}`);
    lines.push(`shape: ${b.avatar_shape}`);
    lines.push(`color: ${b.avatar_color}`);
    lines.push(`primary: ${b.is_primary ? 'yes' : 'no'}`);
    if (skills.length) lines.push(`skills: ${skills.map((s) => s.name.replace(/,/g, '')).join(', ')}`);
    lines.push('');
    lines.push(String(b.instructions || b.description || '').trim());
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

function parseTeamMarkdown(markdown: string): TeamDraft[] {
  const text = markdown.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (text.length > 100_000) throw new Error('team card is too large');
  const chunks = text.split(/\n(?=## )/).map((c) => c.trim()).filter((c) => c.startsWith('## '));
  const drafts: TeamDraft[] = [];
  for (const chunk of chunks.slice(0, 30)) {
    const lines = chunk.split('\n');
    const name = lines[0].replace(/^##\s+/, '').trim().slice(0, 60);
    if (!name || name.startsWith('#')) continue;
    const meta: Record<string, string> = {};
    let i = 1;
    for (; i < lines.length; i++) {
      const m = /^(role|mode|effort|shape|color|primary|skills):\s*(.*)$/.exec(lines[i].trim());
      if (!m) break;
      meta[m[1]] = m[2].trim();
    }
    while (i < lines.length && lines[i].trim() === '') i++;
    const instructions = lines.slice(i).join('\n').trim().slice(0, 8000);
    const effort = EFFORTS.has(meta.effort) ? meta.effort as TeamDraft['effort'] : 'medium';
    drafts.push({
      name,
      label: (meta.role ?? '').slice(0, 80),
      instructions,
      mode: meta.mode === 'teammate' ? 'teammate' : 'personal',
      effort,
      avatarShape: SHAPES.has(meta.shape) ? meta.shape as AvatarShape : undefined,
      avatarColor: COLORS.has(meta.color) ? meta.color as AvatarColor : undefined,
      primary: /^(yes|true|1)$/i.test(meta.primary ?? ''),
      skills: (meta.skills ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12),
    });
  }
  if (!drafts.length) throw new Error('no bots found \u2014 start each one with a ## heading');
  return drafts;
}

export function importTeamMarkdown(
  userId: string,
  markdown: string,
  create: (b: {
    name: string;
    label?: string;
    description?: string;
    instructions?: string;
    avatarShape?: string;
    avatarColor?: string;
    mode?: string;
    isPrimary?: boolean;
  }) => { id: string },
): { created: string[]; skipped: string[] } {
  const drafts = parseTeamMarkdown(markdown);
  const existing = new Set(
    (db.prepare("SELECT lower(name) AS n FROM bots WHERE user_id=? AND COALESCE(hidden,0)=0").all(userId) as { n: string }[]).map((r) => r.n),
  );
  const hasPrimary = !!(db.prepare('SELECT 1 FROM bots WHERE user_id=? AND is_primary=1').get(userId));
  let gavePrimary = hasPrimary;
  const created: string[] = [];
  const skipped: string[] = [];
  for (const d of drafts) {
    if (existing.has(d.name.toLowerCase())) { skipped.push(d.name); continue; }
    const wantPrimary = d.primary && !gavePrimary;
    const bot = create({
      name: d.name,
      label: d.label,
      instructions: d.instructions,
      description: d.label,
      avatarShape: d.avatarShape,
      avatarColor: d.avatarColor,
      mode: d.mode,
      isPrimary: wantPrimary,
    });
    db.prepare('UPDATE bots SET effort=? WHERE id=?').run(d.effort, bot.id);
    for (const skill of d.skills) {
      db.prepare('INSERT INTO skills(id,bot_id,name,body,created_at) VALUES (?,?,?,?,?)').run(newId('skl'), bot.id, skill.slice(0, 60), '', now());
    }
    existing.add(d.name.toLowerCase());
    if (wantPrimary) gavePrimary = true;
    created.push(d.name);
  }
  return { created, skipped };
}
