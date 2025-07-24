const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startAutomation: (data) => ipcRenderer.invoke('start-automation', data),
  selectResume: () => ipcRenderer.invoke('select-resume'),
  onAutomationProgress: (callback) => ipcRenderer.on('automation-progress', (_event, value) => callback(value)),
  onInternshipSubmitted: (callback) => ipcRenderer.on('internship-submitted', (_event, value) => callback(value)), // New listener
});
