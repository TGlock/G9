# G9 - a simple nodejs ~~Web Framework~~ library #

## Minimal ##

A minimalist Node.js ~~framework~~ library written to learn and experiment.  

### Features ###
- **[Router](#Router)** 
  - supports path based variables including types: int, string and float
  - path based middleware
  - custom not found
- **[Static Files with Compression](#Static-Files) and Cacheing:**
  - Gzip and Brotli 
  - Etag support 
  - File watcher - auto recompress 
- **[Middleware](#Router):** Support for 'per Route' unique middleware stacks
- **Error Handling:** All errors bubble to a single block
- **[Logging](#Logging):** Extends console for logging 
- **[Sessions](#Sessions):** Simple memory based session manager based on JS Map
- **[Cookies](#Cookies):** Simple cookie manager for session cookies
- **[Configurable](#Config):** One file to supply configuration info
- **Request, Response** handler signature

### Application File System Structure ###
The directory structure of an application using G9 might as follows:

  - app
    - config.js 
    - api  
      - api_users.js  
      - api_xxxxx.js  
    - lib  
      - database.js  
      - utils.js  
    - web  (can be located on any reachable drive. root of \web is supplied in config.)
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

---
 ### Request, Response ### 

  Request handler functions need only accept a request and response. E.g. myhandler = async (req, res) => { ... }

  Early versions of g9 explored a third "context" (ctx) parameter similar to other frameworks.  Ultimately decided to minimally decorate the request and response objects rather than create an additional context object. Use of symbols (in progress) should help avoid name collisions if 3rd party packages are introduced.
  
  The native node request and response objects are minimally decorated in the G9.augment method method.

  A lesson learned was that use of middleware that needs to alter the response requires some mechanism to hold (buffer) the response until the last middleware returns.

  However, this is at odds with streaming responses; thus there is functionality to support both requirements simultaneously.
 
---
 ### Router ###
  Supports 
    - HTTP Methods: 'GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
    - Paths
    
  **fixed** - `/this/is/a/path` complete paths that do not contain '\:' or end with the wildcard '\*'  
  **variable** - `/some/id/:int:id/` paths with named segment parameters  
  **wildcard** - `/static/*` paths with a fixed '/prefix/' and end with '\*' 
      
  **Initializing Routes**
  
```js
let r = g9.router

// set custom 404 handler 
r.not_found = do_not_found  

/* exclude a route from session check & create. */
r.get('/favicon.ico', do_favicon).session_create = false  

// various datatypes supported 
r.get('/json', do_json)
r.get('/html', do_html)
r.get('/text', do_text)
r.get('/buffer', do_buffer)
r.get('/file', do_file)

// pass method as parameter example 
r.add_route(path, 'GET', func)

// route middleware example 
const authenticated = async (req, res, fn) => {
    console.log('a enter')
    res.prepare(200, 'Authenticated', send_text, 'X-Header', 'A')
    if (fn) await fn()
    console.log('a exit')
}
const authorized = async (req, res, fn) => {
    console.log('b enter')
    res.prepare(200, res.body += '\nAuthorized', send_text, 'X-Header', 'B')
    if (fn) await fn()
    console.log('b exit')
}
const handle_route = async (req, res, fn) => {
    console.log('c enter')
    if (fn) await fn()
    res.prepare(200, res.body += '\nHandled', send_text, 'X-Header', 'C')
    console.log('c exit')
}

/* Router.compose accepts an array of async functions and executes them in the order passed.
Each function must have the (res, res, fn) signature shown above and is responsible to invoke fn() or throw.  */

r.get('/middleware', r.compose([authenticated, authorized, handle_route])
```

---    
### Static Files ###

Static file handling functions are located in sender.js and compress.js.  

These functions support streaming data from disk and/or compressing files below a certain size and storing size, etag, mimetype, etc in a Map so responses may be sent instantly.

---
### Logging ###
---
### Sessions ###

  - See session.js Session class.  
  - Maintains a cache of sessions and uses a timer to expire sessions as needed.  
  - Depends on crypto.js for secure session id generation.

---
### Cookies ###

  See cookie.js functions: cookie_set and cookie_get

---
### Config ###

See config.js.  (May explore reading an environment variable for file location first)

```js
const config = {

    database: {
        user: 'postgres',
        host: 'localhost',
        database: 'xxxxx',
        password: 'xxxxx',
        port: 5432,
    },
    session: {
        cookie: 'g9-sid', //session cookie name
        ttl: 1000 * 2, // two seconds (development testing)
        secret: 'secretkey',
        file: '/Users/tomglock/dev/node/next_3/sessions.json',
        schedule: 1000 * 60, //in ms (5 minutes)
    },
    date_format: {
        weekday: 'narrow',
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: 'numeric',
        fractionalSecondDigits: 3,
        hour12: true,
        timeZone: 'EST'
    },
    csrf: true,
    date_formatter : { locale : 'en-US' },
    hostname: '127.0.0.1',
    port: 8080,
    api_prefix: '/api/',
    watch_update_delay: 500,
    static_parent: '/Users/tomglock/dev/node/next_3/app/web',
    static_prefix: '/static/',
    static_folder_path: '/Users/tomglock/dev/node/next_3/app/web/static/',
    favicon_file: '/Users/tomglock/dev/node/next_3/app/web/static/img/favicon.ico',
    upload_dir: '/Users/tomglock/dev/node/next_3/app/web/static/uploads/',
    view_path: '/Users/tomglock/dev/node/next_3/app/web/static/views/',
    crypt_key : '1c85016910bc4b863aa76a8eca923f83',
}
```
---
### Dependencies (Optional) ### 
- postgres by porsager - https://github.com/porsager/postgres
- @fastify/busboy - https://github.com/fastify/busboy
---
### Inspired by (in no particular order) ###
- Koa.js
- Hono.js
- Blacksheep (Python)
- Flask
- Bottle
- And many others
