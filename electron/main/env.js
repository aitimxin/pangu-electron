const { app } = require('electron');
const path = require('path');
const config = require('../utils/config');

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';

function resolveFrontendTarget() {
  if (isDev) {
    return {
      type: 'url',
      value: config.get('frontend.devUrl', 'http://localhost:8000')
    };
  }

  return {
    type: 'file',
    value: path.join(process.resourcesPath, 'app', 'index.html')
  };
}

module.exports = {
  isDev,
  resolveFrontendTarget
};








