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

### <a name="head12345"></a>A Heading in this SO entry!
#### Best answer is in this [link](#head12345)

 ### Router ###
  Supports 
    - HTTP Methods: 'GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
    - Paths
    
      **normal** - paths that do not contain ':' or ending wildcard '*'  
         /this/is/a/path 
         
      **variable** - paths with named segment parameters  
         /some/id/:int:id/ 
         
      **wildcard** - paths with a fixed '/prefix/' and ends with '*' ( cannot have variable segments )  
         /static/* 

  **Initializing Routes**
  
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
    r.get('/middleware', create_route_middleware_stack(r))`
    
### Inspired by (in no particular order) ###
- Koa.js
- Hono.js
- Blacksheep (Python)
- And many others

