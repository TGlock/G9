# g9 - a simple nodejs web framework #

## Minimal ##

Written only to learn and experiment. 

### Features ###
- **[Router](#Router)**
  - supports path based typed variables: int, string and float
  - per route middleware
  - customizable not found
- **[Sender Functions](#Sender-Functions) - html, text, json, stream, buffer utilities.
- **[Static Files with Compression](#Static-Files)**
  - Gzip and Brotli
  - Etag support
- **[Middleware](#Router)** Support for 'per Route' unique middleware stacks
- **[Logging](#Logging)** Extends console for logging
- **[Sessions](#Sessions)** Simple JS Map based session manager
- **[Cookies](#Cookies)** Simple cookie manager for session cookies
- **[Configurable](#Config)** One configuration file
- **[Request, Response](#Request-Response)** Handler signatures and buffering for middleware
- **[Application Directory Structure](#Application-Directory-Structure)** Application Directory structure
- **[Dependencies (Two)](#Dependencies-Optional)** A database driver and multipart/form-data parsing
- **[Error Handling](#Error-Handling)** All errors trapped at a single point

---
 ### Router ###
  Supports
    - HTTP Methods: 'GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
    - Paths

  **fixed** - `/this/is/a/path` complete paths that do not contain '\:' or end with wildcard '\*'  
  **variable** - `/seg1/seg2/:id:str/` paths with one or more segment variables 'id'  
  **wildcard** - `/static/*` paths with a fixed '/prefix/' and end with '\*'  

  **Initializing Routes**

```js
const routes_init = (g9) => {

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

}
```

Router.compose is based on MIT licensed 'koa-compose' package ( https://github.com/koajs/compose )

---
### Send_XXXX Functions ###

  `send_buffer, send_html, send_json, send_stream, send_text, send_error, send_file`

The send_xxxx (buffer, html, json, stream, text, error, and file) functions all have the same signature:

  `(response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0)` 

  The response object, a http status code, data, http headers and max-age for cacheing. Other than the response, all are defaulted.

  IMPORTANT:
  - Content-Type should/must be explicity set prior to invoking send_stream and send_buffer
  - Because g9 provides the native node request and response objects to handlers there is complete freedom send responses as needed.  In this case response.end() must be called.  Use of send_xxxx functions will automatically invoke response.end().

---
### Static Files ###

Static file handling functions are located in sender.js and compress.js.

These support streaming from disk and/or compressing files below a certain size and storing size, etag, mimetype, etc in a Map so responses may be sent instantly.

---
### Logging ###

  - Logger.js - utilizes Node's console object and associated log levels writing to stdout and stderr.  As with console (log is an alias for debug.)

  ```js
  LOG_LEVELS = {
    trace: 10,
    log: 20,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50
  }
```
---
### Sessions ###

  See session.js Session class.
  - Maintains a cache of sessions and expires sessions per time to live (ttl) config setting.
  - Depends on crypto.js for secure session id generation.
  - Will not scale and does not persist between restarts.
  - Currently using node crypto randomBytes  

---
### Cookies ###

  See cookie.js : 
  -  cookie_set
  -  cookie_get 
  -  Needs work

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
        file: '/Users/tomglock/dev/node/next_3/sessions.json', // TODO
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
### Application Directory Structure ###
Example directory structure of an application built using G9:

  - main.js  
  - app
    - app.js
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
  - main.js is Nodejs startup file.
  - app.js imports ( directly or indirectly ) other modules required for the application.
    - Ex. app.js imports ( directly or indirectly ) modules with api endpoints.
  - app.js assigns exported route handlers to g9 router
  - app imports database module with associated driver and class and/or utility functions
  - app may import any modules from g9 and execute functions directly
    - sender.js
    - compress.js
    - etc..
  - app can utilize a file system watcher to react to changes, recompress etc.

**main.js** 
```js
"use strict";

import { G9 } from './G9/g9.js'
import { config } from './app/config.js'
import { routes_init } from './app/app.js'
import { database_open } from './app/lib/database.js'

// create G9
const g9 = new G9(config)

// open database
const db = database_open(config)

// init routes
await routes_init(g9)

// listen
g9.listen().then().catch((err) => {
    g9.logger.error('Unable to start server.')
})
```
---
 ### Request, Response ###

  Request handler functions need only accept a request and response. E.g. myhandler = async (req, res) => { ... }

  Early versions of g9 explored a third "context" (ctx) parameter similar to other frameworks.  Ultimately decided to minimally decorate the native request and response objects rather than create an additional context object.  See g9.augment() for details.  Use of symbols (TODO) should help avoid name collisions with 3rd party and future nodejs attributes.

  Note: 
  Use of middleware that must alter or cancel a response before it is sent implies some mechanism to hold (buffer) the response until the last middleware executes.   
  
  request.prepare(...), response.body and response.reply(...) enable buffering of response data and assigning a 'sender' function at any point during request processing. 
  
  For example a handler for /api/v1/users/:id:str/ might look like this:

  ```js
  const read_one = async (req, res) => {
      let id = req.route.params.get('id'),
          sql = pg_sql`SELECT id, email, uname, status, dt_create
              FROM
                myschema.tbl_user WHERE id = ${ id };` // see https://github.com/porsager/postgres#query-parameters
      let rows = await sql_exec(sql)
      res.prepare((rows.length) ? 200 : 404, rows, send_json )  //404 for id not found
  }
  ```

  ( Buffering of data across requests, async function processing during requests and number of concurrent requests will increase memory cost. )

  Simple streaming helps lower memory costs, and there is functionality to support chunked responses.  See send_stream() and send_file().
  
---
### Error Handling ###
- All errors are trapped in a try catch wrapping the call to the handler assigned to the route.
- Heuristics are applied to determine appropriate response content-type (json, html, text etc.)
  - Not optimal and better options exist.
  
---
### Dependencies (Optional) ###
- postgres by porsager - postgresql driver - https://github.com/porsager/postgres
- @fastify/busboy - multipart/form-data (file upload) - https://github.com/fastify/busboy
---

### Inspired by (in no particular order) ###
- Koa.js
- Hono.js
- Fastify.js
- Blacksheep (Python)
- Flask
- Bottle
- Chi (Go)
- Echo
- And many many others

