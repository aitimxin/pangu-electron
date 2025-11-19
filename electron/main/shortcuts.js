const { globalShortcut } = require('electron');
const logger = require('../utils/logger');
const config = require('../utils/config');

function registerGlobalShortcuts(getMainWindow) {
  const shortcuts = config.getShortcuts();

  if (shortcuts.toggleWindow) {
    const success = globalShortcut.register(shortcuts.toggleWindow, () => {
      const window = getMainWindow();
      if (!window) {
        return;
      }

      if (window.isVisible()) {
        window.hide();
      } else {
        window.show();
        window.focus();
      }
    });

    if (success) {
      logger.info('Global shortcut registered:', shortcuts.toggleWindow);
    } else {
      logger.warn('Failed to register global shortcut:', shortcuts.toggleWindow);
    }
  }
}

function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
}

module.exports = {
  registerGlobalShortcuts,
  unregisterGlobalShortcuts
};














