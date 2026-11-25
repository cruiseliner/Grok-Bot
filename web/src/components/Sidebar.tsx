import { memo, useCallback, useState } from 'react';
import { useConfigUI } from '../configStore';
import { TasksIsland } from './config/TasksView';
import type { Bot } from '@shared/types';
import { BotAvatarFor } from '../avatar/BotAvatar';
import { displayName, useStore } from '../store';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { Menu } from './Menu';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function TrafficLights() {
  return (
    <div className="traffic-lights" aria-hidden>
      <span style={{ background: '#FF5F57' }} />
      <span style={{ background: '#FEBC2E' }} />
      <span style={{ background: '#28C840' }} />
    </div>
  );
}

function previewFor(bot: Bot, running: boolean, awaiting: string | null) {
  if (awaiting) return `Waiting for you: ${awaiting}`;
  if (running && !bot.lastPreview) return 'Working\u2026';
  return bot.lastPreview ?? 'No messages yet';
}

const BotRow = memo(function BotRow({ bot, selected, running, awaiting, onSelect, onMenu }: { bot: Bot; selected: boolean; running: boolean; awaiting: string | null; onSelect: (id: string) => void; onMenu: (id: string, x: number, y: number) => void }) {
  return (
    <button
      type="button"
      className={`bot-row${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(bot.id)}
      onContextMenu={(e) => { e.preventDefault(); onMenu(bot.id, e.clientX, e.clientY); }}
      aria-current={selected || undefined}
    >
      <span className="bot-row__avatar">
        <BotAvatarFor bot={bot} size={36} />
        {(running || awaiting || bot.unread > 0) && (
          <span className={`status-dot ${awaiting ? 'is-attention' : running ? 'is-working' : 'is-unread'}`} aria-label={awaiting ? 'Needs attention' : running ? 'Working' : 'Unread activity'} />
        )}
      </span>
      <span className="bot-row__text">
        <span className="bot-row__name">{displayName(bot)}</span>
        <span className="bot-row__preview">{previewFor(bot, running, awaiting)}</span>
      </span>
    </button>
  );
});

export function Sidebar() {
  const bots = useStore((s) => s.bots);
  const live = useStore((s) => s.live);
  const storeSelectedBotId = useStore((s) => s.selectedBotId);
  const inTasks = useConfigUI((s) => s.view === 'tasks');
  const selectedBotId = inTasks ? null : storeSelectedBotId;
  const user = useStore((s) => s.user);
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const set = useStore((s) => s.set);
  const storeSelectBot = useStore((s) => s.selectBot);
  const selectBot = useCallback((id: string) => { useConfigUI.getState().setView('chat'); storeSelectBot(id); }, [storeSelectBot]);
  const setModal = useStore((s) => s.setModal);
  const loadBots = useStore((s) => s.loadBots);
  const [accountMenu, setAccountMenu] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const flash = (t: string) => { setNotice(t); setTimeout(() => setNotice(null), 2200); };
  const logout = async () => { await api.logout().catch(() => {}); location.reload(); };
  const openMenu = useCallback((id: string, x: number, y: number) => setRowMenu({ id, x, y }), []);

  const copyTeam = async () => {
    try {
      const { markdown } = await api.exportTeam();
      await navigator.clipboard.writeText(markdown);
      flash('Team card copied');
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not copy'); }
  };

  const runRowAction = async (id: string, action: 'pin' | 'duplicate' | 'hide' | 'copy') => {
    const bot = bots.find((b) => b.id === id);
    if (!bot) return;
    try {
      if (action === 'copy') { await navigator.clipboard.writeText(bot.id); flash('Copied conversation id'); return; }
      if (action === 'pin') await api.patchBot(id, { pinned: !bot.pinned });
      if (action === 'duplicate') { const { bot: copy } = await api.duplicateBot(id); flash(`Duplicated ${bot.name}`); selectBot(copy.id); }
      if (action === 'hide') {
        await api.hideBot(id);
        const lead = useStore.getState().bots.find((b) => b.isPrimary);
        if (useStore.getState().selectedBotId === id && lead) selectBot(lead.id);
        flash(`${bot.name} hidden`);
      }
      await loadBots();
    } catch (e) { flash(e instanceof Error ? e.message : 'Could not update'); }
  };

  const primary = bots.find((b) => b.isPrimary);
  const others = bots.filter((b) => !b.isPrimary).sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar__titlebar">
        <TrafficLights />
        <div className="sidebar__controls">
          <button type="button" className="icon-btn icon-btn--plain" onClick={() => set({ sidebarCollapsed: !collapsed })} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title="Toggle sidebar (\u2318B)">
            <Icon name="sidebar" opacity={0.66} />
          </button>
          {!collapsed && (
            <>
              <button type="button" className="icon-btn" onClick={() => setModal('search')} aria-label="Search" title="Search (\u2318K)">
                <Icon name="search" opacity={0.66} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setModal('create')} aria-label="New Bot" title="New Bot">
                <Icon name="plus" opacity={0.66} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="sidebar__scroll">
        <TasksIsland />
        {primary && (
          <div className="pinned">
            <button type="button" className={`pinned__tile${selectedBotId === primary.id ? ' is-selected' : ''}`} onClick={() => selectBot(primary.id)} onContextMenu={(e) => { e.preventDefault(); openMenu(primary.id, e.clientX, e.clientY); }} title={displayName(primary)}>
              <span className="pinned__avatar">
                <BotAvatarFor bot={primary} size={collapsed ? 44 : 60} star />
                {live[primary.id]?.isRunning && <span className="status-dot is-working pinned__dot" />}
              </span>
              {!collapsed && <span className="pinned__label">{displayName(primary)}</span>}
            </button>
          </div>
        )}
        <div className="bot-list">
          {others.map((b) =>
            collapsed ? (
              <button key={b.id} type="button" className={`bot-rail-item${selectedBotId === b.id ? ' is-selected' : ''}`} onClick={() => selectBot(b.id)} title={displayName(b)}>
                <BotAvatarFor bot={b} size={36} />
              </button>
            ) : (
              <BotRow key={b.id} bot={b} selected={selectedBotId === b.id} running={!!live[b.id]?.isRunning} awaiting={live[b.id]?.awaiting?.reason ?? null} onSelect={selectBot} onMenu={openMenu} />
            ),
          )}
          {!collapsed && others.length === 0 && (
            <button type="button" className="bot-list__empty" onClick={() => setModal('create')}>
              <span className="bot-list__empty-plus"><Icon name="plus" size={14} opacity={0.66} /></span>
              <span>
                <span className="bot-row__name">Create a Bot</span>
                <span className="bot-row__preview">Give it a job, like research or inbox triage</span>
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__fade" />
        {!collapsed && (
          <div className="account">
            <button type="button" className="account__btn" onClick={() => setAccountMenu(!accountMenu)} aria-haspopup="menu" aria-expanded={accountMenu} title={user?.email}>
              <span className="account__initials">{initials(user?.name ?? user?.email ?? '')}</span>
              <span className="account__name">{user?.name ?? user?.email}</span>
            </button>
            {accountMenu && (
              <Menu
                placement="above"
                onClose={() => setAccountMenu(false)}
                items={[
                  { label: 'Settings', hint: '\u2318,', onSelect: () => useConfigUI.getState().openAppSettings() },
                  { label: 'Connect apps', onSelect: () => setModal('apps') },
                  { label: 'Copy team card', onSelect: () => { void copyTeam(); } },
                  { label: 'Import team card', onSelect: () => { setImportText(''); setImportOpen(true); } },
                  { label: 'Log out', danger: true, onSelect: logout },
                ]}
              >
                <div className="menu__header">{user?.email}</div>
              </Menu>
            )}
          </div>
        )}
        <button type="button" className="icon-btn icon-btn--bordered" onClick={() => setModal('apps')} aria-label="Connect apps" title="Connect apps">
          <Icon name="apps" />
        </button>
      </div>
      {rowMenu && (
        <div className="row-menu-anchor" style={{ position: 'fixed', left: rowMenu.x, top: rowMenu.y, zIndex: 40 }}>
          <Menu
            onClose={() => setRowMenu(null)}
            items={(() => {
              const bot = bots.find((b) => b.id === rowMenu.id);
              if (!bot) return [];
              return [
                { label: bot.pinned ? 'Unpin' : 'Pin', onSelect: () => { void runRowAction(bot.id, 'pin'); } },
                { label: 'Duplicate', onSelect: () => { void runRowAction(bot.id, 'duplicate'); } },
                { label: 'Copy conversation id', onSelect: () => { void runRowAction(bot.id, 'copy'); } },
                ...(bot.isPrimary ? [] : [{ label: 'Hide', danger: true, onSelect: () => { void runRowAction(bot.id, 'hide'); } }]),
              ];
            })()}
          />
        </div>
      )}
      {importOpen && (
        <div className="team-import" role="dialog" aria-label="Import team card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void api.importTeam(importText).then(async (r) => {
                setImportOpen(false);
                await loadBots();
                flash(r.created.length ? `Added ${r.created.join(', ')}` : 'Nothing new to add');
              }).catch((err) => flash(err instanceof Error ? err.message : 'Could not import'));
            }}
          >
            <h2>Import a team card</h2>
            <p>Paste a card exported from this app. Chats, memories, and keys are never in it. A starter crew is in teams/personal-crew.md.</p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={10} placeholder={'## Ada\nrole: Chief of staff\neffort: medium\n\nKeep the day moving.'} />
            <div className="team-import__actions">
              <button type="button" onClick={() => setImportOpen(false)}>Cancel</button>
              <button type="submit">Add bots</button>
            </div>
          </form>
        </div>
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </aside>
  );
}
