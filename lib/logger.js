"use strict";

import { Console } from 'console'

const LOG_LEVELS = {
    trace: 10,
    log: 20,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50
}

//see https://nodejs.org/api/console.html#new-consoleoptions
const _console = new Console({ stdout: process.stdout, stderr: process.stderr })

const Logger = (level = 0) => {

    return {
        trace: (level <= LOG_LEVELS.trace) ? _console.trace : () => { },
        log: (level <= LOG_LEVELS.log) ? _console.log : () => { },
        debug: (level <= LOG_LEVELS.debug) ? _console.log : () => { },  //debug is alias for log
        info: (level <= LOG_LEVELS.info) ? _console.info : () => { },
        warn: (level <= LOG_LEVELS.warn) ? _console.warn : () => { },
        error: (level <= LOG_LEVELS.error) ? _console.error : () => { },
    }

}

export { Logger, LOG_LEVELS }