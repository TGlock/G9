'use strict';

const mimes = new Map([
  ['.htm', { mime: 'text/html; charset=utf-8', compress: true }],
  ['.html', { mime: 'text/html; charset=utf-8', compress: true }],
  ['.jpeg', { mime: 'image/jpeg', compress: false }],
  ['.jpg', { mime: 'image/jpg', compress: false }],
  ['.ico', { mime: 'image/x-icon', compress: false }],
  ['.js', { mime: 'text/javascript; charset=utf-8', compress: true }],
  ['.mjs', { mime: 'text/javascript; charset=utf-8', compress: true }],
  ['.css', { mime: 'text/css; charset=utf-8', compress: true }],
  ['.txt', { mime: 'text/plain', compress: true }],
  ['.pdf', { mime: 'application/pdf', compress: false }],
  ['.gif', { mime: 'image/gif', compress: false }],
  ['.png', { mime: 'image/png', compress: false }],
  ['.xml', { mime: 'application/xml', compress: true }],
  ['.woff', { mime: 'font/woff', compress: false }],
  ['.woff2', { mime: 'font/woff2', compress: false }],
  ['.json', { mime: 'application/json; charset=utf-8', compress: true }],
  ['.svg', { mime: 'image/svg+xml', compress: true }],
])

export {
    mimes
}