# G9 - a simple NodeJS ~~web framework~~ library #

## Minimal ##

A minimalist Node.js ~~framework~~ library written to learn and experiment.  

### Features ###
- **[Router](#Router)** 
  - supports path based variables including types: int, string and float
  - path based middleware
  - custom not found
- **Static Files with Compression and Cacheing:**
  - Gzip and Brotli 
  - Etag support 
  - File watcher - auto recompress 
- **Middleware:** Support for 'per Route' unique middleware stacks
- **Error Handling:** All errors bubble to a single block
- **Logging:** Extends console for logging 
- **Sessions:** Simple memory based session manager based on JS Map
- **Cookies:** Simple cookie manager for session cookies
- **Request, Response** handler signature

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
    
  **fixed** - `/this/is/a/path` complete paths that do not contain '\:' or ending wildcard '\*'  
  **variable** - `/some/id/:int:id/` paths with named segment parameters  
  **wildcard** - `/static/*` paths with a fixed '/prefix/' and end with '\*' 
      
  **Initializing Routes**
  
```js
let r = g9.router

/* set custom 404 handler */
r.not_found = do_not_found  

/* exclude a route from session check & create. */
r.get('/favicon.ico', do_favicon).session_create = false  

/* various datatypes supported */
r.get('/json', do_json)
r.get('/html', do_html)
r.get('/text', do_text)
r.get('/buffer', do_buffer)
r.get('/file', do_file)

/* pass method as parameter example */
r.add_route(path, 'GET', func)

/* 
  route middleware example 
*/
const create_route_middleware_stack = (router) => {
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

  /* 
    Router.compose accepts a variable number of async functions and executes them in the order passed.
    Each function must have the signature shown above and is responsible to call the next function or throw. 
  */
  return router.compose([authenticated, authorized, handle_route])

}

/* 
  The function returned from router.compose must then be added the the router with path and method as always. 
*/
r.get('/middleware', create_route_middleware_stack(r))
```

---    
### Static Files ###

Static file handling functions are located in sender.js.  

These functions support scenarios such as file streaming from disk and/or compressing files below a certain size and storing sizes, etags, mimetypes and other data in a map such that responses can be sent immediately.  The latter capability is associated with a file watcher to ensure changes are captured.

---
### Inspired by (in no particular order) ###
- Koa.js
- Hono.js
- Blacksheep (Python)
- And many others

