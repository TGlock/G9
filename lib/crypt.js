'use strict';

import { assert } from 'console'
import { createRequire } from 'module'
import { config } from '../../app/config.js'

import { Logger, LOG_LEVELS } from './logger.js';

let _logger = Logger()

const require = createRequire(import.meta.url) //cause crypto still CommonJS :(
const crypto = require('crypto')

//const { subtle, getRandomValues } = crypto.webcrypto;

//ENCRYPT_KEY must be 256 bits (32 characters)
//can be generated via crypto.randomBytes(16).toString("hex") or manually: a_32_char_len_encryption_key_123
//should be stored in process.env.ENCRYPT_KEY or config
const ENCRYPT_KEY = config.crypt_key
const IV_LENGTH = 16 //AES is always 16


const key_create = (size, encoding = 'base64') => {
    return crypto.randomBytes(size).toString(encoding)  //encoding hex or base64
}

const csrf_create = () => {
    return Math.random().toString(36).slice(2) //crypto.randomBytes(32).toString('hex')
}
const csrf_validate = () => {
    //TODO: validate csrf token
}

//for session ids
const randomUUID = () => {
    return crypto.randomUUID()
}

//AES 256 encrypt & decrypt functions
//Equiv to NodeJS WebCrypto (currently experimental) https://nodejs.org/api/webcrypto.html
//see https://www.w3.org/TR/WebCryptoAPI/
const aes256_encrypt = (text) => {
    let iv = crypto.randomBytes(IV_LENGTH)
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY), iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

const aes256_decrypt = (text) => {
    let textParts = text.split(':')
    let iv = Buffer.from(textParts.shift(), 'hex')
    let encryptedText = Buffer.from(textParts.join(':'), 'hex')
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPT_KEY), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
}

//hash and verify via scrypt algorithm (generates very long hashed password)
const scrypt_hash = async (password) => {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(8).toString("hex")
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err)
            resolve(salt + ":" + derivedKey.toString('hex'))
        })
    })
}

const scrypt_verify = async (password, hash) => {
    return new Promise((resolve, reject) => {
        const [salt, key] = hash.split(":")
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) reject(err)
            resolve(key === derivedKey.toString('hex'))
        })
    })
}

assert(("encryption ok" === aes256_decrypt(aes256_encrypt("encryption ok"))))

export {
    csrf_create,
    csrf_validate,
    aes256_encrypt,
    aes256_decrypt,

    scrypt_hash,
    scrypt_verify,
    randomUUID,
    key_create
}