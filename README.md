# g9 - a simple nodejs web framework #

## Minimal ##

Written only to learn and experiment.

### Features ###
- **[Router](#Router)**
  - supports GET, PUT, POST, PATCH, DELETE, HEAD & OPTIONS http methods
  - typed path segment variables: int, string and float e.g. '/api/users/:id:int'
  - per route middleware stack(s) via compose function
  - per route session mapping & cookie setting (defaults to true)
  - customizable '404 not found' handler
- **[Sender Functions](#Send_xxxx-Functions)**
  - Send xxxx functions:
    - json, html, text, chunked stream | buffered etc...
- **[Static Files](#Static-Files)**
  - Compression - Gzip and Brotli
  - Etag support
- **[Middleware](#Router)** Support for 'per Route' unique middleware stacks
- **[Logging](#Logging)** Extends console for logging
- **[Sessions](#Sessions)** Simple JS Map based session manager
- **[Cookies](#Cookies)** Simple cookie manager for session cookies
- **[Config Params](#Config)**
- **[Request, Response](#Request-Response)** Handler signatures and buffering for middleware
- **[Application Directory Structure](#Application-Directory-Structure)** Application Directory structure
- **[Dependencies (Two)](#Dependencies-Optional)** A database driver and multipart/form-data parsing
- **[Error Handling](#Error-Handling)** All errors trapped at a single point

---
 ### Router ###
  Supports
    - HTTP Methods: 'GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
    - Paths

  **fixed** - `/this/is/a/path` paths that do not contain '\:' or end with wildcard '\*'

  **variable** - `/seg1/seg2/:id:int/` paths with one or more segment variables. ('id:str' var id must be int)

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

  The send_xxxx functions all have the same signature:

  `(response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0)`

  The response object, an http status code, data, http headers and max-age for cacheing.

  Other than the response, all are defaulted.

  IMPORTANT:
  - Content-Type should/must be explicity set prior to invoking send_stream and send_buffer
  - Because g9 provides the native node request and response objects to handlers there is complete freedom send responses as needed.  In this case response.end() must be called.
  - Use of send_xxxx functions automatically invokes response.end().

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

See G9 constructor for config params.

```js
class G9 {

    constructor(config) {
        this._port = config.port || 8080
        this._protocol = config.protocol || 'http://'
        this._hostname = config.hostname || hostname()
        this._domain = config.domain || 'app'
        this._max_size = config._max_size || 1024 * 512
        this._pid = process.pid + '-'
        this._decoder_utf8 = new StringDecoder('utf8')
        this._date_formatter = new Intl.DateTimeFormat(config.date_formatter.locale || 'en-US', config.date_format || { weekday: 'narrow', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: 'numeric', fractionalSecondDigits: 3, hour12: true, timeZone: 'EST' }).format
        this._csrf = config.csrf || true
        this._session_cookie_name = config.session.cookie || 'g9-sid'
        this._session_mgr = new Session(config.session)
        this._upload_dir = config.upload_dir
        this._server = createServer()
        this._router = new Router()
        this._logger = Logger(config.log_level || LOG_LEVELS.debug)
    }
```

---
### Application Directory Structure ###
An example directory structure of an application built on G9.

  - myapp
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
    - g9.js
    - lib
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
  - /myapp and /g9 are sibling directories in this example.
  - /myapp/main.js is node startup file.
  - app.js imports G9.js and other /lib modules as and where needed.
    - Ex. app.js imports ( directly or indirectly ) modules with api endpoints.
  - app.js assigns exported route handlers to g9 router
  - app imports database module with associated driver and class and/or utility functions
  - app may import any modules from g9 and execute functions directly
    - sender.js
    - compress.js
    - etc..

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

  Request handler function signatures must accept a request and response as first two parameters.

  E.g. `myhandler = async (req, res) => { ... }`

  Early versions of g9 explored incorporating a "context" (ctx) parameter similar to other frameworks.  Ultimately decided to minimally decorate the native request and response objects rather than create and decorate an additional context object.  See g9.augment() for details.

  Use of ES6 Symbols (TODO) might help avoid name collisions with 3rd party and future nodejs attributes.  ( Needs further exploration. )

  G9 enables both 'immediate' responses and buffered reponses.

  Buffering and Middleware:\
  Any framework that enables middleware to alter or cancel a response before it is sent must then buffer the response until after the last middleware executes.

  request.prepare(...), response.body and response.reply(...) enable buffering of response data and assigning a 'sender' function.

  `response.prepare(status, data, send_func, ...headers)`

  For example: a handler for `/api/v1/users/:id:str/` might look like this:

  ```js
  const read_one = async (req, res) => {
      let id = req.route.params.get('id'),
          sql = pg_sql`SELECT id, email, uname, status, dt_create
              FROM
                myschema.tbl_user WHERE id = ${ id };` // see https://github.com/porsager/postgres#query-parameters
      let rows = await sql_exec(sql)
      res.prepare((rows.length) ? 200 : 404, rows, send_json )  //404 in case id was not found
  }
  ```

  Use of route.prepare() is optional and is intended to be used in route handlers with middleware stacks.
  Common examples are 'protected' routes such as '/api/', '/admin' etc.

  Unbuffered Responses and Streaming:\

  To send unbuffered responses:
  Invoke response.send passing status, data and http headers.

  `response.send = function (status = this.statusCode, data = this.body, headers = null)`

  Invoke any send_xxxx function.  send_stream() and send_file() support chunked / streamed responses.

---
### Error Handling ###
- Route handler errors are trapped in a try catch wrapping the call to the handler assigned to the route.
- Heuristics are applied to determine appropriate response content-type (json, html, text etc.)
  - Better options exist - needs further exploration and testing for recovery/restart...

---
### Dependencies (Optional) ###
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

