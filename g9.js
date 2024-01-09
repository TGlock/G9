'use strict';

import { createServer, STATUS_CODES } from 'http'
import { hostname } from 'os'
import { StringDecoder } from 'string_decoder'

import querystring from 'node:querystring'

import { Router } from './lib/router.js'
import { Session } from './lib/session.js'

import { multipart } from './lib/multipart.js';
import { cookie_set, cookie_get } from './lib/cookie.js'
import { send_text, send_error, send_json } from './lib/sender.js';

// 'defacto standard' - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For
const ip_get = (request) => {
    const xff = request.headers['x-forwarded-for']
    return xff?.substr(0, xff.indexOf(',')) || request.socket?.remoteAddress
}

const session_create = (g9, request, response) => {

    //session cookie sent ?
    let session_key = cookie_get(request, g9._session_cookie_name),
        session_obj = null;

    if (session_key) { // g9-sid cookie value - is it in the store ?  if so, 'touch' it
        session_obj = g9._session_mgr.get(session_key, true)
        if (!(session_obj == null)) { // not found, invalid or expired...
            session_key = ''  // set to empty so new session object is created falling through below...
        }
    }

    if (session_key === '') { //create empty session object - more useful values added during login/register
        session_key = g9._session_mgr.key_create()
        session_obj = g9._session_mgr.set(session_key, { sid: session_key })
        cookie_set(response, g9._session_cookie_name, session_key) //TODO set domain correctly
    }

    return { session_key: session_key, session_obj: session_obj }
}

const request_parse = (request, response) => {

    // decode any request data that may have been sent
    if (request.chunks.length) {

        const buffer = Buffer.concat(request.chunks)

        let data = '',
            content_type = request.headers['content-type'] || '',
            parser = null;

        if (content_type.startsWith('application/json')) {  // ignore ';charset=xxx' (not required for json)
            data = buffer.toString('utf8')    // json is always utf8 - https://www.ietf.org/rfc/rfc4627.txt
            parser = JSON.parse
        } else if (content_type.startsWith('application/x-www-form-urlencoded')) {
            data = buffer.toString('utf8')
            parser = querystring.parse
        } else if (content_type.startsWith('multipart/form-data')) {
            return //data already parsed
        } else {
            console.log('unknown content-type')
            response.statusCode = 415 //Unsupported Media Type - see https://datatracker.ietf.org/doc/html/rfc7231
            request.params = null
            parser = null
            throw new Error('Unsupported Media Type')
        }

        try {
            request.params = parser(data)
        } catch (err) {
            response.statusCode = 400
            throw err
        }

    }

}

//TODO - consider symbols
const augment = (g9, request, response) => {

    //augment request
    const now = performance.now();

    request.is_event_stream = (request.headers.accept === 'text/event-stream')
    request.client_ip = ip_get(request)
    request.trace_id = g9._pid + now.toFixed(4)
    request.start_time = now

    // NOTE use of 'function' to ensure 'this' refers to the response itself
    // see - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
    response.prepare = function (status, data, send_func, ...headers) {
        let max = headers.length;
        if (max === 1) {  //headers an array ?
            headers = headers[0]
            max = headers.length
        }
        for (let i = 0; i < max - 1; i += 2) {
            this.setHeader(headers[i], headers[i + 1])
        }
        this.statusCode = status
        this.body = data
        this.reply = send_func
    }

    response.send = function (status = this.statusCode, data = this.body, headers = null) {

        if (headers) {
            this.writeHead(status, STATUS_CODES[status], headers)
        } else {
            this.statusCode = status
        }

        if (status === 304 || this.req.method === 'HEAD') {
            this.end()
        } else {
            if (data?.pipe) { // duck typing...
                data.pipe(this)
            } else {
                this.end(data)
            }
        }
    }

    response.sendex = function (status = this.statusCode, data = this.body, headers = {}) {

        if (data?.pipe) { // stream

            headers['transfer-encoding'] = 'chunked'

        } else { // other...

            if (Buffer.isBuffer(data)) {
                headers['content-length'] = data.length
            } else {
                if (typeof data === 'object') {
                    data = JSON.stringify(data)
                }
                headers['content-length'] = Buffer.byteLength(data)
            }

        }

        this.writeHead(status, STATUS_CODES[status], headers)

        if ((status === 304 || this.req.method === 'HEAD')) {
            this.end()
        } else {
            (data?.pipe) ? data.pipe(this) : this.end(data)
        }

    }

    // WHATWG url parsing ... see https://nodejs.org/api/url.html#class-url
    request.URL = new URL(g9._protocol + request.headers.host + request.url)
    request.path = decodeURIComponent(request.url)
    const q = request.path.indexOf('?')
    if (q !== -1) {
        request.path = request.path.substr(0, q)
    }

    //route match ?
    request.route = g9._router.match(request.path, request.method)
    if (request.route) {
        //TODO - consider using route to hint the intended response data type:
        //json, text, html, binary, etc
        //avoids typeof and duck typing ... and error format...
    } else {
        // TODO - determine text or json 404 response...
        // check accepts ? method ? hueristics?
        // check path '/static' - send html, '/api/ send json
        response.prepare(404, 'Not Found', send_text)
    }

    //create session ? ( skip session processing for static resources )
    if (request?.route.session_create) {
        let sess = session_create(g9, request, response)
        request.session_mgr = g9._session_mgr
        request.session_key = sess.session_key
        request.session_obj = sess.session_obj
    }

    //populated later...
    request.chunks = []     // raw application/json or application/x-www-form-urlencoded buffer chunks
    request.params = {}     // final parsed data sent in request

    response.body = null    // (stream, buffer, string, json, filename) to be sent in response.reply()
    response.reply = null   // (optional) function to .end() response, assigned via response.prepare()

}

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
        this._session_mgr = new Session({ttl:(90 * 1000)})
        this._static_prefix = config.static_prefix || '/static/'
        this._upload_dir = config.upload_dir
        this._server = createServer() //this.serve auto performs .on('request', this.serve)
        this._router = new Router()
    }

    close() {
        console.log('closing listener...')
        this._server.close((err) => {
            if (err) {
                console.log('listener close err', err)
            }
            return false
        })
        console.log('listener closed.')
        return true
    }

    listen(port) {
        if (port) {
            this._port = port
        }

        // register handler
        this._server.on('request', this.serve)

        // listen
        try {
            this._server.listen({ port: this._port, host: '0.0.0.0' })
        } catch (err) {
            if (err.code === 'EADDRINUSE') {
                console.error(`Address in use: ${this._domain + ':' + this._port} `);
            }
            throw err
        }

        this._server.on('error', (err) => {
            console.error('Server Error:', err);
        });

        console.log(`${this._protocol}${this._hostname}:${this._port} started at ${new Date()}`)
    }

    log(req, res) {
        console.log(this._date_formatter(new Date()),
            req.client_ip,
            req.trace_id,
            req.session_key || '--------------------------------',
            req.method,
            res.statusCode,
            (performance.now() - req.start_time).toFixed(4) + 'ms',
            req?.route?.execute?.name || '\t',
            req.path)
    }

    set router(router) {
        this._router = router
    }
    get router() {
        return this._router
    }
    get session_mgr() {
        return this._session_mgr
    }

    serve = async (request, response) => {

        try {

            // decorate request and response objects
            augment(this, request, response)

            // invoked on request 'close' event
            const request_complete = async () => {

                try {

                    //concatenate and parse incoming app/json or xxx url encoded data
                    request_parse(request, response)

                    //execute the route
                    await request.route.execute(request, response)

                    //send 'prepared' response ?
                    if (response.reply)
                        await response.reply(response)

                } catch (error) {
                    send_error (
                        response,
                        (response.statusCode === 200) ? 500 : response.statusCode,
                        error
                    )
                }

                // log response info
                this.log(request, response)

            }

            // invoked on request 'error' event
            const request_on_error = (error) => {
                console.log("ERROR - request 'error' event raised:", error)
                //TODO - attempt to handle somehow ?
                response.prepare(500, error_to_json(error), send_json)
            }

            // ... assign event handlers ...

            // 'error' event - log it
            request.on('error', request_on_error)

            //if multipart stream ... consume and parse it...
            if (request.headers['content-type']?.substring(0, 20) === 'multipart/form-data;') {
                console.log('G9 before multipart')

                const resolved_pre = (data) => {
                    console.log('resolved pre', data)
                }
                const rejected_pre = (err) => {
                    console.log('rejected pre', err)
                }
                const resolved = async (data) => {
                    console.log('G9 after multipart');
                    request.data = data
                    await request_complete()
                    return
                }
                const rejected = (error) => {
                    console.log('Multipart Error (rejected)', error)
                    response.prepare(500, error, send_error)
                    throw error
                    //return
                }

                await multipart(request, this._upload_dir, resolved_pre, rejected_pre).then(resolved, rejected).catch(rejected)

            } else {

                // listen for 'data' event
                //  store and parse data sent by client ... store/concat to buffer or disk
                //  See - https://nodejs.org/api/stream.html#event-data
                //  Note - Allows data to be processed for ALL http methods thus enabling invalid client requests .. e.g. GET with data
                //  Note - listener MUST be assigned AFTER multipart check
                request.on('data', (data) => { request.chunks.push(data) })

                //handle request
                request.on('end', request_complete)

            }

        } catch (error) {
            console.log('G9 serve error:', error)
            response.statusCode = 500
            response.end()
        }

    }
}

export {
    G9
}