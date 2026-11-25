const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

let server = null;
let win = null;

function configPath() {
  return path.join(app.getPath('userData'), 'config.env');
}

function readConfig() {
  const file = configPath();
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function writeConfig(cfg) {
  const body = Object.entries(cfg).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), body, { encoding: 'utf8' });
}

function clean(value) {
  const v = String(value ?? '').trim();
  if (/[\r\n]/.test(v)) throw new Error('A key cannot contain a line break.');
  return v;
}

function resources() {
  return app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
}

function nodeBinary() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'node.exe');
  return process.env.npm_node_execpath || 'node';
}

function serverEntry() {
  return path.join(resources(), 'server', 'dist', 'index.js');
}

function freePort(start) {
  return new Promise((resolve, reject) => {
    if (start > 8900) { reject(new Error('No free port')); return; }
    const probe = net.createServer();
    probe.once('error', () => resolve(freePort(start + 1)));
    probe.listen(start, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

function waitForHealth(port) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else if (Date.now() - started > 30000) reject(new Error('The server did not become ready.'));
        else setTimeout(tick, 400);
      });
      req.on('error', () => {
        if (Date.now() - started > 30000) reject(new Error('The server did not start. See server.log in the app data folder.'));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function stopServer() {
  if (!server || server.killed) return;
  const pid = server.pid;
  server = null;
  if (!pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
  } else {
    try { process.kill(pid); } catch { /* already gone */ }
  }
}

async function startServer() {
  stopServer();
  const cfg = readConfig();
  if (!cfg.XAI_API_KEY) throw new Error('Add an xAI key first.');
  if (!cfg.SESSION_SECRET) {
    cfg.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    writeConfig(cfg);
  }
  const port = await freePort(8787);
  const origin = `http://127.0.0.1:${port}`;
  const logPath = path.join(app.getPath('userData'), 'server.log');
  const log = fs.createWriteStream(logPath, { flags: 'w' });
  const entry = serverEntry();
  if (!fs.existsSync(entry)) throw new Error('The server build is missing. Run the Windows installer build again.');
  const child = spawn(nodeBinary(), [entry], {
    cwd: path.join(resources(), 'server'),
    windowsHide: true,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_URL: origin,
      SERVER_URL: origin,
      DEV_LOGIN: '1',
      DB_PATH: path.join(app.getPath('userData'), 'teammates.db'),
      XAI_API_KEY: cfg.XAI_API_KEY,
      XAI_MODEL: cfg.XAI_MODEL || 'grok-4.7',
      SESSION_SECRET: cfg.SESSION_SECRET,
      COMPOSIO_API_KEY: cfg.COMPOSIO_API_KEY || 'desktop-unused',
      ORGO_API_KEY: cfg.ORGO_API_KEY || 'desktop-unused',
      ORGO_WORKSPACE_ID: cfg.ORGO_WORKSPACE_ID || '',
      ELECTRON_RUN_AS_NODE: '',
    },
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.on('exit', (code) => { if (server === child) log.write(`\nserver exit ${code}\n`); });
  server = child;
  await waitForHealth(port);
  return origin;
}

function showSetup() {
  if (!win) return;
  win.loadFile(path.join(__dirname, 'setup.html'));
}

async function openApp() {
  if (!win) return;
  try {
    const origin = await startServer();
    await win.loadURL(origin);
  } catch (err) {
    showSetup();
    const message = err instanceof Error ? err.message : 'Could not start.';
    win.webContents.once('did-finish-load', () => {
      win.webContents.executeJavaScript(`document.getElementById('err').textContent = ${JSON.stringify(message)}`);
    });
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Cruiseliner',
    backgroundColor: '#141210',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('http://127.0.0.1:') || url.startsWith('file:');
    if (!allowed) {
      event.preventDefault();
      if (url.startsWith('https://')) shell.openExternal(url);
    }
  });
  const cfg = readConfig();
  if (!cfg.XAI_API_KEY) showSetup();
  else void openApp();
}

ipcMain.handle('keys:save', async (_event, raw) => {
  const xaiKey = clean(raw && raw.xaiKey);
  if (!xaiKey) throw new Error('The xAI key is required.');
  const prev = readConfig();
  writeConfig({
    XAI_API_KEY: xaiKey,
    XAI_MODEL: prev.XAI_MODEL || 'grok-4.7',
    SESSION_SECRET: prev.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    COMPOSIO_API_KEY: clean(raw && raw.composioKey),
    ORGO_API_KEY: clean(raw && raw.orgoKey),
    ORGO_WORKSPACE_ID: clean(raw && raw.workspaceId),
  });
  await openApp();
  return { ok: true };
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'Keys',
        submenu: [
          { label: 'Edit keys', click: () => { stopServer(); showSetup(); } },
          { role: 'quit' },
        ],
      },
    ]));
    createWindow();
  });
}

app.on('before-quit', stopServer);
app.on('window-all-closed', () => app.quit());
