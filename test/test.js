// A simple test to verify a visible window is opened with a title
var Application = require('spectron').Application
var assert = require('assert')

var app = new Application({
  path: process.platform === 'win32' ? 'dist\\WebTorrent-win32-ia32\\WebTorrent.exe'
	: process.platform === 'darwin' ? 'dist/WebTorrent-darwin-x64/WebTorrent.app/Contents/MacOS/WebTorrent'
        : '.' // TODO
})

app.start().then(function () {
  // Check if the window is visible
  return app.mainWindow.isVisible()
}).then(function (isVisible) {
  // Verify the window is visible
  assert.equal(isVisible, true, "should show a window")
}).then(function () {
  // Get the window's title
  return app.client.getTitle()
}).then(function (title) {
  // Verify the window's title
  assert.equal(title, 'WebTorrent')
}).then(function () {
  // Stop the application
  return app.stop()
}).catch(function (error) {
  // Log any failures
  console.error('Test failed', error.message)
})
