'use strict';

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import util from 'util';
import { brotliCompress, deflate, gzip } from 'zlib';

import { Logger, LOG_LEVELS } from './logger.js';

import { mimes } from './mime.js';
import { file_stat } from './sender.js'

// promisify compression functions to make then 'await'able
// see - https://nodejs.org/dist/latest-v8.x/docs/api/util.html#util_util_promisify_original
const brotli_async = util.promisify(brotliCompress)
const deflate_async = util.promisify(deflate)
const gzip_async = util.promisify(gzip)

const _logger = Logger()

class Compressor {

    constructor(config) {
        this._map = new Map()
        this._ttl = config?.ttl || (2 * 1000)
        this._timeout_handle = setTimeout(this.check_stale, this._ttl, this)
    }

    // based on https://gist.github.com/lovasoa/8691344.js"
    async * directory_walk (dir)  {
        for await (const d of await fs.promises.opendir(dir)) {
            const entry = path.join(dir, d.name);
            if (d.isDirectory()) yield* await directory_walk(entry);
            else if (d.isFile()) yield entry;
        }
    }

    directory_list = async function (directory) {
        let list = []
        for await (const p of directory_walk(directory))
            list.push(p.replaceAll('\\', '/'))

        _logger.info(list)
        return list
    }

    check_stale () {
        _logger.log('check stale')
    }

}

//import config for static path

//iterate through directory tree...
//
// IDEAS - if file is compressable ... compress to dedicated directory
//      compress to buffer with offet (i.e. pic lib)
//      compress to map ?

// based on https://gist.github.com/lovasoa/8691344.js"
async function* directory_walk(dir, shallow = false) {
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        //console.log('shallow', shallow)
        if (!shallow && d.isDirectory()) {
            yield* await directory_walk(entry);
        } else if (d.isFile()) {
            yield entry;
        }
    }
}

const directory_list = async (directory, shallow) => {
    let list = []
    for await (const p of directory_walk(directory, shallow))
        list.push(p.replaceAll('\\', '/'))

    _logger.info(list)
    return list
}

const file_compress = async (filename, memstore_max_limit = (128 * 1024), compress_max_limit = (384 * 1024)) => {

    try {

        let stat = await file_stat(filename)

        //check size and 'compressability'
        if (stat.compress) {

            if (stat.size <= compress_max_limit) {
                const buffer_input = fs.readFileSync(filename)
                const buffer_output = await brotli_async(buffer_input)
                stat.enco = 'br'

                if (buffer_output.length < memstore_max_limit) {

                    stat.data = buffer_output

                } else {

                    // write compressed file to disk...
                    stat.encoded_file = filename + '.br'
                    fs.writeFileSync(stat.encoded_file, buffer_output)
                    stat.size = buffer_output.length
                }
            }

        } else {

            if (stat.size <= memstore_max_limit) {  //store uncompressed
                stat.data = fs.readFileSync(filename)
            }

        }

        return stat

    } catch (err) {
        _logger.error(err)
    }

    return null

}

export {
    directory_list,
    file_compress,
    Compressor
}