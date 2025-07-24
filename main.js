import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url'; 
import { dirname } from 'path';     
import dotenv from 'dotenv';
import { runInternshalaAutomation } from './puppeteer_automation.js';
import mongoose from 'mongoose'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Connect to MongoDB (if needed)
await mongoose.connect(process.env.MONGO_URI )
 .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), 
      nodeIntegration: false, 
      contextIsolation: true, 
      enableRemoteModule: false 
    },
  });

  win.loadFile('index.html');

};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('start-automation', async (event, { email, password, resumePath }) => {
  const sendProgress = (message) => {
    event.sender.send('automation-progress', message);
  };
  const sendSubmittedInternship = (internshipDetails) => {
    event.sender.send('internship-submitted', internshipDetails);
  };

  try {
    const submittedDetails = await runInternshalaAutomation(
      { email, password, resumePath },
      sendProgress,
      sendSubmittedInternship 
    );
    return { success: true, submittedDetails };
  } catch (error) {
    sendProgress(`FATAL ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-resume', async (event) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });
  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});

