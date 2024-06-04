# G9 - a simple NodeJS ~~web framework~~ library #

## Minimal ##

A minimalist Node.js ~~framework~~ library written by me just to learn and experiment.  

### Features ###
- **Routing:** Simple routing system for handling HTTP requests
  - path based variables
    - data types int, string, float
- **Static Files with Compression and Cacheing:**
  - Gzip and Brotli compression
  - Etag support 
  - File watcher - auto recompress 
- **Middleware:** Support for 'per Route' unique middleware stacks
- **Error Handling:** All errors bubble to a single block
- **Logging:** Extends console for logging 
- **Sessions:** Simple memory based session manager based on JS Map
- **Cookies:** Simple cookie manager for session cookies

### Dependencies (Optional) ### 
- postgres by porsager - https://github.com/porsager/postgres
- @fastify/busboy - https://github.com/fastify/busboy

### Application File System Structure ###
- The directory structure of an application using G9 might as follows:

- app
  - api
    - api_users.js
    - api_xxxxx.js
  - lib
    - database.js
    - utils.js
  - web
    - static
      - htm
      - img
      - css
      - js
- g9
  - lib
    - g9.js
    - compress.js
    - router.js
    - sender.js
    - sessions.js
    - cookie.js
    - logger.js
    - mime.js
    - multipart.js
    - (etc)

Notes:
- app and g9 are sibling directories.
- app contains api endpoints such as users etc.
- app manages database and associated driver and code
- app dictates static file response via functions in g9/sender.js
- app dictates compression rules via functions in g9/compress.js

### Inspired by (in no particular order) ###
- Koa.js
- Hono.js
- Blacksheep (Python)
- And many others

