const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// Ensure production mode
process.env.NODE_ENV = 'production';

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();

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

  // Start Express Backend Server
  try {
    console.log("Starting backend Express server within Electron...");
    require('./dist/server.cjs');
  } catch (err) {
    console.error("Failed to start backend Express server:", err);
  }

  // Set up Electron Application
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
    minHeight: 500,
    minWidth: 400,
    title: "Overdesk FX Calendar",
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Frameless option or custom clean visual appearance
    autoHideMenuBar: true,
  });

  // Load the Express server url
  mainWindow.loadURL('http://localhost:3000');

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
      checked: false,
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
