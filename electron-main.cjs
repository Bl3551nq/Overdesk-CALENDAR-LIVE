const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Force clean custom namespace for OS AppData registry, storage, logs, and updates
app.name = 'Overdesk FX Calendar';
app.setName('Overdesk FX Calendar');

// Ensure production mode
process.env.NODE_ENV = 'production';

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Register IPC handlers for window control from renderer process
ipcMain.on('resize-window', (event, width, height) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setContentSize(width, height);
  }
});

ipcMain.on('drag-window', (event, delta) => {
  if (mainWindow && !mainWindow.isDestroyed() && delta) {
    const [x, y] = mainWindow.getPosition();
    const dX = Math.round(delta.dX || 0);
    const dY = Math.round(delta.dY || 0);
    mainWindow.setPosition(x + dX, y + dY);
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('clear-app-data', (event) => {
  const { session } = require('electron');
  if (session && session.defaultSession) {
    session.defaultSession.clearStorageData().then(() => {
      console.log('[CLEAR DATA] Cleared all storages successfully.');
      app.relaunch();
      app.exit(0);
    }).catch(err => {
      console.error('[CLEAR DATA] Error clearing storage data:', err);
    });
  }
});

ipcMain.on('set-launch-on-start', (event, enable) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,
      path: process.execPath
    });
    console.log(`[STARTUP] Dynamic launch-on-start configured: ${enable}`);
  } catch (err) {
    console.error('Failed to modify login item settings:', err);
  }
});

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();

// Fix DPI scaling mismatch on Windows high-resolution displays
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

if (!gotTheLock) {
  app.quit();
} else {
  // Focus existing instance if a second one tries to open
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  // Set up Electron Application
  app.whenReady().then(() => {
    // Standardize paths and app root
    process.env.ELECTRON_APP_PATH = app.getAppPath();

    // Automatically clear network and HTTP caches on startup to clean up any obsolete web assets in the background
    const { session } = require('electron');
    if (session && session.defaultSession) {
      session.defaultSession.clearCache().then(() => {
        console.log('[CACHE] HTTP and network asset cache cleared successfully on startup.');
      }).catch(err => {
        console.warn('[CACHE] Failed to clear browser caches:', err);
      });
    }

    // Start Express Backend Server inside ready event
    try {
      console.log("Starting backend Express server within Electron...");
      require('./dist/server.cjs');
    } catch (err) {
      console.error("Failed to start backend Express server:", err);
    }

    createWindow();
    createTray();

    // Start background auto-updates
    initAutoUpdater();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 390,
    height: 560,
    useContentSize: true, // Treat dimensions as exact web page viewport sizes
    minHeight: 30, // Enable perfect scale down for 54px compact bubble launcher
    minWidth: 30, // Enable perfect scale down for 54px compact bubble launcher
    title: "Overdesk FX Calendar",
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
    },
    // Frameless and transparent options
    frame: false,
    transparent: true,
    autoHideMenuBar: true,
    hasShadow: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true, // Always on top by default
    show: false, // ← FIXED: Don't show until fully painted — eliminates crop-on-launch race condition
  });

  // Keep window floated at highest z-order level across spaces/fullscreens
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Load the Express server url
  mainWindow.loadURL('http://localhost:3000');

  // FIXED: Only show window once content is fully rendered
  // This prevents the invisible-border/crop bug that appeared sometimes on launch
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle load failure gracefully (retry until server is fully active)
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL && (validatedURL.startsWith('http://localhost:3000') || validatedURL.startsWith('http://127.0.0.1:3000'))) {
      console.log(`Failed to load ${validatedURL} (${errorDescription}). Retrying in 1000ms...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:3000');
        }
      }, 1000);
    }
  });

  // Handle Close Button action (hide to system tray instead of exiting)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // On window focus, check state
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const rawIcon = nativeImage.createFromPath(iconPath);
  
  // Resize to a perfect standard desktop tray resolution
  const trayIcon = rawIcon.resize({ width: 16, height: 16 });
  
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Overdesk FX Calendar', 
      className: 'tray-open-item',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(menuItem.checked);
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit Application', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Overdesk FX Calendar');
  tray.setContextMenu(contextMenu);
  
  // Standard toggle behavior when clicking the tray icon
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// OS wide window-all-closed handler
app.on('window-all-closed', () => {
  // Do not quit app, as it runs silently in the system tray
  if (process.platform !== 'darwin') {
    // Keep alive for system tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

function initAutoUpdater() {
  console.log("Initializing electron-updater for background deployment...");

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    console.error('Auto Updater encoutered an error:', err);
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates on GitHub...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`Update is available! Version found: ${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('Already running the latest version of Overdesk FX Calendar.');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Downloading update: ${progressObj.percent.toFixed(2)}% completed...`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`Update downloaded! Prepared version: ${info.version}`);

    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready to Install',
      message: `A new version (${info.version}) of Overdesk FX Calendar has been successfully downloaded in the background.\n\nWould you like to restart the application now to apply the update?`,
      buttons: ['Restart and Update Now', 'Install on Exit'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        console.log('User chose to restart and install update.');
        autoUpdater.quitAndInstall();
      } else {
        console.log('User deferred installation until application exit.');
      }
    });
  });

  // Check for updates 5 seconds after startup (non-blocking)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Failed to run initial GitHub update check:', err);
    });
  }, 5000);

  // Periodically check for updates every 2 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error('Failed to run periodic update check:', err);
    });
  }, 2 * 60 * 60 * 1000);
}
