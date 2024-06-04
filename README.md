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

### Router ###
Supports 
  - HTTP Methods: 'GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
  - Paths
    - **normal** - paths that do not contain ':' or ending wildcard '*'  
      ` /this/is/a/path`
    - **variable** - paths with named segment parameters  
      ` /some/id/:int:id/`
    - **wildcard** - paths with a fixed '/prefix/' that ends with '*' ( cannot have variable segments )  
      ` /static/*`

  **Initializing Routes**
     
    `let r = g9.router

    r.not_found = do_not_found  // allows for custom 404 handler
    
    r.get('/favicon.ico', do_favicon).session_create = false  //exclude any route from session check & create.

    /* various datatypes supported */
    r.get('/json', do_json)
    r.get('/html', do_html)
    r.get('/text', do_text)
    r.get('/buffer', do_buffer)
    r.get('/file', do_file)`
  

### Inspired by (in no particular order) ###
- Koa.js
- Hono.js
- Blacksheep (Python)
- And many others

