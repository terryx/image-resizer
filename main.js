const electron = require('electron')
const url = require('url')
const path = require('path')
const Store = require('electron-store')
const store = new Store()

const { app, BrowserWindow, Menu, dialog } = electron

let mainWindow

const defaultWidth = 960
const defaultHeight = 600

// Listen for app to be ready
app.on('ready', function () {
  // Create new mainWindow
  mainWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight
  })

  // Load html into mainWindow
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, './templates/upload.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Quit app when closed
  mainWindow.on('closed', function () {
    app.quit()
  })
})

module.exports.getDefaultSetting = (callback) => {
  const setting = store.get('setting')

  if (setting) {
    return callback(setting)
  }

  const defaultSetting = {
    downloadPath: app.getPath('downloads'),
    quality: 100,
    width: null,
    height: null,
    fit: '',
    format: null,
    prefix: 'rz',
    postfix: ''
  }

  return callback(defaultSetting)
}

module.exports.selectDirectory = (callback) => {
  dialog.showOpenDialog(mainWindow, { properties: ['openDirectory', 'createDirectory'] }, callback)
}
