'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prinskrin', {
  init: () => ipcRenderer.invoke('overlay:init'),
  ready: () => ipcRenderer.send('overlay:ready'),
  windows: () => ipcRenderer.invoke('overlay:windows'),
  save: (dataURL) => ipcRenderer.invoke('overlay:save', dataURL),
  saveAs: (dataURL) => ipcRenderer.invoke('overlay:save-as', dataURL),
  copy: (dataURL) => ipcRenderer.invoke('overlay:copy', dataURL),
  captureDisplay: (displayId) => ipcRenderer.invoke('overlay:capture-display', displayId),
  openSettings: () => ipcRenderer.invoke('overlay:open-settings'),
  cancel: () => ipcRenderer.invoke('overlay:cancel'),
  claim: () => ipcRenderer.invoke('overlay:claim'),
  onDeactivate: (handler) => ipcRenderer.on('overlay:deactivate', () => handler()),
});
