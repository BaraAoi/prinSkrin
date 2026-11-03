'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('prinskrin', {
  get: () => ipcRenderer.invoke('settings:get'),
  update: (patch) => ipcRenderer.invoke('settings:update', patch),
  reset: () => ipcRenderer.invoke('settings:reset'),
  browse: () => ipcRenderer.invoke('settings:browse'),
  openFolder: () => ipcRenderer.invoke('settings:open-folder'),
  capture: () => ipcRenderer.invoke('settings:capture'),
  close: () => ipcRenderer.invoke('settings:close'),
  onChange: (handler) => ipcRenderer.on('settings:changed', (event, data) => handler(data)),
});
