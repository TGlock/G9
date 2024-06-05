'use strict';

import { promises, createReadStream } from 'fs'
import * as path from 'path'

import { mimes } from './mime.js'
import { Logger, LOG_LEVELS } from './logger.js';

let _logger = Logger()

const file_stat = async (filename, stream_create = false) => {

    try {

        const stat = await promises.stat(filename)

        if (stat.isFile()) {

            let extn = path.extname(filename),
                m = mimes.get(extn);

            return {
                name: filename,
                extn: extn,
                mime: (m) ? m.mime : 'application/octet-stream',
                compress: (m) ? m.compress : false,
                etag: '"' + stat.mtimeMs + '"',
                stat: stat,
                size: stat.size,
                data: (stream_create) ? createReadStream(filename) : null
            }
        } else {
            throw new Error('ENOENT')
        }

    } catch (err) {
        throw err
    }

}

// support 'if-none-match'
// see https://tools.ietf.org/html/rfc7232#section-4.1
const none_match = (req, res, etag, max_age = '120') => {
    res.setHeader('Cache-Control', 'max-age=' + max_age)
    res.statusCode = (etag === req.headers['if-none-match']) ? 304 : 200
    res.setHeader('ETag', etag)
    return res.statusCode
}

const add_no_cache = function (hdrs, expire = new Date().toUTCString()) {

    hdrs['expires'] = expire
    hdrs['last-modified'] = expire
    hdrs['cache-control'] = 'max-age=0, no-cache, must-revalidate, proxy-revalidate, private, no-store'

    return hdrs
}

const error_to_text = (err) => { return (err.code || '') + '\n\n' + err.message + '\n\n' + err.stack }
const error_to_html = (err, entity = 'p') => { return `<${entity}>${(err.code || '')}</${entity}><${entity}>${err.message}</${entity}><${entity}>${err.stack}</${entity}>` }
const error_to_json = (err) => { return { error: { code: (err.code || ''), message: err.message, stack: err.stack } } }

//TODO - more tests for send_error
const send_error = function (response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0) {

    /* const is_error = (obj) => {
        return Object.prototype.toString.call(obj) === "[object Error]";
    } */

    let data_text = '',
        data_html = '',
        data_json = {};

    if (data instanceof Error) {
        data_text = error_to_text(data)
        data_html = error_to_html(data)
        data_json = error_to_json(data)
    }

    send_text(response, status, data_text, hdrs, max_age)
}


const send_text = function (response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0) {

    hdrs['content-type'] = 'text/plain; charset=utf-8'

    if (data?.pipe) {
        hdrs['transfer-encoding'] = 'chunked'
    } else {
        hdrs['content-length'] = (typeof data === 'string') ? Buffer.byteLength(data, 'utf-8') : data.length
    }

    if (max_age) {
        hdrs['cache-control'] = 'max-age=' + max_age
    } else {
        add_no_cache(hdrs)
    }

    response.send(status, data, hdrs)
}

const send_html = function (response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0) {

    hdrs['content-type'] = 'text/html; charset=utf-8'

    if (data?.pipe) {
        hdrs['transfer-encoding'] = 'chunked'
    } else {
        hdrs['content-length'] = (typeof data === 'string') ? Buffer.byteLength(data, 'utf-8') : data.length
    }

    if (max_age) {
        hdrs['cache-control'] = 'max-age=' + max_age
    } else {
        add_no_cache(hdrs)
    }

    response.send(status, data, hdrs)

}

const send_json = function (response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0) {

    data = JSON.stringify(data)

    hdrs['content-type'] = 'application/json; charset=utf-8'
    hdrs['content-length'] = Buffer.byteLength(data, 'utf-8')

    if (max_age) {
        hdrs['cache-control'] = 'max-age=' + max_age
    } else {
        add_no_cache(hdrs)
    }

    response.send(status, data, hdrs)
}

// Note content-type must be set previously for send stream and send buffer
const send_buffer = function (response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0) {

    hdrs['content-length'] = data.length

    if (max_age) {
        hdrs['cache-control'] = 'max-age=' + max_age
    } else {
        add_no_cache(hdrs)
    }

    response.send(status, data, hdrs)
}

const send_stream = function (response, status = response.statusCode, data = response.body, hdrs = {}, max_age = 0) {

    hdrs['transfer-encoding'] = 'chunked'

    if (max_age) {
        hdrs['cache-control'] = 'max-age=' + max_age
    } else {
        add_no_cache(hdrs)
    }

    response.send(status, data, hdrs)
}

const send_file = async function (response, status = response.statusCode, filename = response.body, hdrs = {}, max_age = 0) {

    try {

        let f_data = await file_stat(filename)

        hdrs['content-type'] = (f_data.mime) ? f_data.mime : 'application/octet-stream'

        if (f_data.etag === response.req.headers['if-none-match']) {
            status = 304
        }
        hdrs['etag'] = f_data.etag

        response.body = createReadStream(filename)
        response.body.size = f_data.size

        send_stream(response, status, response.body, hdrs, max_age)

    } catch (error) {
        response.statusCode = (error.message === 'ENOENT') ? 404 : 500
        throw error
    }

}

const send = () => {
    _logger.log('send called')
}

export {
    send_buffer,
    send_html,
    send_json,
    send_stream,
    send_text,
    send_error,
    send_file,
    file_stat,
    none_match,
    add_no_cache,
    error_to_html,
    error_to_json,
    error_to_text,
    send
}