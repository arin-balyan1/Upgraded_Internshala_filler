import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { dirname } from 'path';     // Import dirname
import dotenv from 'dotenv';
import { runInternshalaAutomation } from './puppeteer_automation.js';
import mongoose from 'mongoose'; // Import mongoose here if you need it in the main process

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to MongoDB (if needed)
// await mongoose.connect(process.env.MONGO_URI || "mongodb+srv://arinbalyan:ldZsIikKx3mlwSRf@cluster0.cksskgm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/Internshala_filler_database")
//   .then(() => console.log('MongoDB Connected'))
//   .catch(err => console.error('MongoDB connection error:', err));

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Use a preload script for security
      nodeIntegration: false, // Keep nodeIntegration false for security
      contextIsolation: true, // Keep contextIsolation true for security
      enableRemoteModule: false // Disable remote module for security
    },
  });

  win.loadFile('index.html');
  // Open the DevTools.
  // win.webContents.openDevTools();
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

// IPC handler for starting the automation
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
      sendSubmittedInternship // Pass the new callback
    );
    return { success: true, submittedDetails };
  } catch (error) {
    sendProgress(`FATAL ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// IPC handler for selecting resume file
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

// Preload script (for security)
// This script will run before your web page is loaded into the renderer process.
// It allows you to expose specific Node.js modules or functions to the renderer process
// without enabling full Node.js integration.
// Create a file named `preload.js` in the same directory as `main.js`.
