'use strict';

import { promises, createReadStream, createWriteStream } from 'fs'

import { key_create } from './crypt.js'

import { Logger, LOG_LEVELS } from './logger.js';

let _logger = Logger()

import Busboy from '@fastify/busboy'

const multipart = async (request, upload_dir) => {
    return new Promise((resolve, reject) => {

        //using fastify/busboy for multipart decoding - actively maintained - only two dependencies
        //Returns fields and files (already persisted) object info object

        try {

            const busboy = Busboy({ headers: request.headers }) //TODO - this throws...
            const form_data = { fields: {}, files: [] }

            //init listeners
            busboy.on('file', async (fieldname, filestream, filename, encoding, mimetype) => {

                let info = {
                    fieldname,
                    filename,
                    encoding,
                    mimetype,
                    extension: '.' + mimetype.substring(mimetype.indexOf('/') + 1),
                    tempname: null
                }

                //create tempfile base name  TODO - stat check...
                info.tempname = upload_dir + key_create(16, 'hex') + info.extension

                //store file info wih form_data
                form_data.files.push(info)

                // filestream.on('data', (data) => {
                //     _logger.info(`File [${fieldname}] got ${data.length} bytes`);
                // }).on('end', () => {
                //      _logger.info(`File [${fieldname}] done`);
                //  });

                //write to temporary store
                filestream.pipe(createWriteStream(info.tempname));

            })
            busboy.on('field', (name, value, info) => {
                form_data.fields[name] = value;
            })
            busboy.on('finish', () => {
                resolve(form_data)
            })
            busboy.on('error', (err) => {
                _logger.error('multipart - busboy "error" event', err)
                reject(err)
            })

            request.pipe(busboy) //consume & parse request stream...

        } catch (err) {
            _logger.error('multipart Error:', err, 'invoking reject...')
            reject(err)
        }

    });
}

export {
    multipart
}