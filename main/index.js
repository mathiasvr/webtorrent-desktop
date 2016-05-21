console.time('init')

var electron = require('electron')

var app = electron.app
var ipcMain = electron.ipcMain

var announcement = require('./announcement')
var config = require('../config')
var crashReporter = require('../crash-reporter')
var handlers = require('./handlers')
var ipc = require('./ipc')
var log = require('./log')
var menu = require('./menu')
var shortcuts = require('./shortcuts')
var squirrelWin32 = require('./squirrel-win32')
var tray = require('./tray')
var updater = require('./updater')
var windows = require('./windows')

var shouldQuit = false
var argv = sliceArgv(process.argv)

if (process.platform === 'win32') {
  shouldQuit = squirrelWin32.handleEvent(argv[0])
  argv = argv.filter((arg) => arg.indexOf('--squirrel') === -1)
}

// if (!shouldQuit) {
//   // Prevent multiple instances of app from running at same time. New instances signal
//   // this instance and quit.
//   shouldQuit = app.makeSingleInstance(onAppOpen)
//   if (shouldQuit) {
//     app.quit()
//   }
// }

if (!shouldQuit) {
  init()
}

function init () {
  if (config.IS_PORTABLE) {
    app.setPath('userData', config.CONFIG_PATH)
  }

  var isReady = false // app ready, windows can be created
  app.ipcReady = false // main window has finished loading and IPC is ready
  app.isQuitting = false

  // Open handlers must be added as early as possible
  app.on('open-file', onOpen)
  app.on('open-url', onOpen)

  ipc.init()

  app.on('will-finish-launching', function () {
    crashReporter.init()
  })

  app.on('ready', function () {
    isReady = true

    windows.createMainWindow()
    windows.createWebTorrentHiddenWindow()
    menu.init()
    shortcuts.init()

    // To keep app startup fast, some code is delayed.
    setTimeout(delayedInit, config.DELAYED_INIT)
  })

  app.on('ipcReady', function () {
    log('Command line args:', argv)
    processArgv(argv)
    console.timeEnd('init')
  })

  app.on('before-quit', function (e) {
    if (app.isQuitting) return

    app.isQuitting = true
    e.preventDefault()
    windows.main.send('dispatch', 'saveState') /* try to save state on exit */
    ipcMain.once('savedState', () => app.quit())
    setTimeout(() => app.quit(), 2000) /* quit after 2 secs, at most */
  })

  app.on('activate', function () {
    if (isReady) windows.createMainWindow()
  })
}

function delayedInit () {
  announcement.init()
  tray.init()
  handlers.install()
  updater.init()
}

function onOpen (e, torrentId) {
  e.preventDefault()

  if (app.ipcReady) {
    windows.main.send('dispatch', 'onOpen', torrentId)
    // Magnet links opened from Chrome won't focus the app without a setTimeout. The
    // confirmation dialog Chrome shows causes Chrome to steal back the focus.
    // Electron issue: https://github.com/atom/electron/issues/4338
    setTimeout(function () {
      windows.focusWindow(windows.main)
    }, 100)
  } else {
    argv.push(torrentId)
  }
}

function onAppOpen (newArgv) {
  newArgv = sliceArgv(newArgv)

  if (app.ipcReady) {
    log('Second app instance opened, but was prevented:', newArgv)
    windows.focusWindow(windows.main)

    processArgv(newArgv)
  } else {
    argv.push(...newArgv)
  }
}

function sliceArgv (argv) {
  return argv.slice(config.IS_PRODUCTION ? 1 : 2)
}

function processArgv (argv) {
  argv.forEach(function (arg) {
    if (arg === '-n') {
      menu.showOpenSeedFiles()
    } else if (arg === '-o') {
      menu.showOpenTorrentFile()
    } else if (arg === '-u') {
      menu.showOpenTorrentAddress()
    } else if (arg.startsWith('-psn')) {
      // Ignore OS X launchd "process serial number" argument
      // More: https://github.com/feross/webtorrent-desktop/issues/214
    } else {
      windows.main.send('dispatch', 'onOpen', arg)
    }
  })
}
