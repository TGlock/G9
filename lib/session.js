"use strict";

import { createRequire } from 'module'
const require = createRequire(import.meta.url) //cause crypto still CommonJS :(
const crypto = require('crypto')

class Session {

    constructor(config) {
        this._map = new Map()
        this._ttl = config.ttl || (300 * 1000) // (5 minute default)
        this._timeout_handle = setTimeout(this.check_stale, this._ttl, this)
    }

    evict = () => {
        const now = performance.now(),
              map = this._map,
              ttl = this._ttl,
              n = map.size;

        for (const [k, v] of map.entries()) {
            if ((now - v.last_touch) >= ttl) {
                map.delete(k)
            }
        }
       //console.log('sessions counnt', map.size,'sessions evicted:', n - map.size, 'time:', performance.now() - now)
    }

    check_stale (session_mgr) {
        //console.log('checking stale...')
        session_mgr.evict()
        session_mgr._timeout_handle = setTimeout(session_mgr.check_stale, session_mgr._ttl, session_mgr)
    }

    //24 random bytes encoded as base64 (six bits per byte) yields a 32 character ascii string
    key_create (size = 24) {
        let key = ''
        do {
            key = crypto.randomBytes(size).toString('base64') // 'base64' yields more possible chars than hex
        } while (this._map.has(key))
        return key
        //other possibilities:
        //  key = randomUUID()
        //  key = Math.random().toString(36).slice(2)
    }

    exists(key) {
        return this._map.has(key)
    }

    expired(key) {
        return (this._map(key)?.last_touch - performance.now()) > this._ttl
    }

    set(key, item) {
        this._map.set(key, { item: item, last_touch: performance.now() })
        return item
    }

    add(item) {
        let key = this.key_create()
        this.set(key, { item: item, last_touch: performance.now() })
        return key
    }

    get(key, touch = true) {
        const now = performance.now()
        let item = this._map.get(key)
        if (item) {
            if (touch) {
                item.last_touch = now
            }
            item.expired = ((now - item.last_touch) > this._ttl)
        }
        return (item) ? item.item : null
    }

    delete(key) {
        return this._map.delete(key)
    }

    touch(key) {
        const item = this._map.get(key)
        if (item) {
            item.last_touch = performance.now()
        }
        return (item) ? item.item : null
    }

    get size() {
        return this._map.size
    }

    clear () {
        this._map = new Map()
    }

}

export { Session }