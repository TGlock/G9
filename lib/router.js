'use strict';

/* Router supports the following paths:
    "normal"   -  paths that do not contain ':' or ending wildcard '*'
    "variable" -  paths with named segment parameters
    "wildcard" -  paths with a fixed '/prefix/' that ends with '*' ( cannot have variable segments )

    Variable paths have known attributes:

        http method
        total # of segments
        a prefix (can be zero)
        the segments that are fixed and those that are variable (dynamic)

        ':' in a path marks it as 'dynamic'
        ':' in a segment indicates a variable segment.
        Examples:

        DELETE /api/v1/users/:345  (prefix: 'api/v1/users/', segments: 4, #4 is dynamic)
        PATCH  /api/v1/nodes/:678/:45/:67 (prefix: 'api/v1/nodes/', segments: 6, #3,#4,#5 are dynamic)

        this/is/a/:vari:int/
        :baseresource:str/
        nodes/:tree_id:int/
        nodes/:tree_id:int/:parent_id:int/  'GET', read)
        nodes/:tree_id:int/:parent_id:int/  'POST', create)
        nodes/:tree_id:int/:parent_id:int/:node_id:int'  'PUT', update)
        nodes/:tree_id:int/:parent_id:int/:node_id:int', 'DELETE', del)

        IMPORTANT multiple variable routes can have same:
            Method,
            # of segments
            Prefix

            example
                GET api/v1/users/45/interest/4
                GET api/v1/users/45/health/4

            GET 6 api/v1/users

        The key to the variable routes map is 'method' and '# of segments'
            variable route map entries are arrays
            for each entry
                if all fixed parts match, route is considered found.

        Collisions are anticipated and allowed (thus use of array) but expect relatively few in actual use.

    Transformers -
        optional - ability to covert a raw route parameter to something else
                    before route function is called.  ( could be done in each route function )

    Validators -
        TO EXPLORE - same concept as transformer - ability to invoke a custom method to ensure
        route param meets some criteria.  integer, floating, regex, etc.
*/

class Router {

    constructor( config = { check_head: true }) {

        this._not_found = null

        this._config = config

        this._norm = new Map()
        this._wild = new Map()
        this._vari = new Map() // each entry in this map is an array

        //map of functions used to 'transform' dynamic route segment values to named route parameter value
        //can be extended see transformer_add,
        this._transformers = new Map()
        this._transformers.set('str', (v) => { return v }) //nop
        this._transformers.set('int', (v) => { return parseInt(v, 10) })
        this._transformers.set('fun', (r, v) => { return r(v) })
        this._transformers.set('rgx', (r, v) => { return r(v) })
    }

    // Based on the code in the MIT licensed `koa-compose` package.
    compose = (middleware) => {

        // validate
        let msg = 'middleware parameter must be array of functions.'
        if (!Array.isArray(middleware)) throw new TypeError(msg)
        for (const fn of middleware) {
            if (typeof fn !== 'function') throw new TypeError(msg)
        }

        /**
         * @param {Object} context
         * @return {Promise}
         * @api public
         */

        return function (request, response, next) {
            // last called middleware #
            let index = -1
            return dispatch(0)
            function dispatch(i) {
                if (i <= index) return Promise.reject(new Error('next() called multiple times'))
                index = i
                let fn = middleware[i]
                if (i === middleware.length) fn = next
                if (!fn) return Promise.resolve()
                try {
                    return Promise.resolve(fn(request, response, dispatch.bind(null, i + 1)))
                } catch (err) {
                    return Promise.reject(err)
                }
            }
        }
    }

    clean_path = (path) => {

        let i = 0, j = path.length - 1;

        if (path.startsWith('/'))
            i += 1

        if (!path.endsWith('/'))
            j += 1

        return path.substring(i, j)
    }

    //TODO research OpenAPI format
    get_routes = () => {

        let info = []

        for (let [key, route] of this._norm) {
            info.push(
                {
                    url: route.pattern,
                    methods: route.methods.join(','),
                    handler: route.execute.name
                })
        }
        for (let [key, entries] of this._vari) {
            for (let entry of entries) {
                info.push({
                    url: entry.route.pattern,
                    methods: entry.route.methods.join(','),
                    handler: entry.route.execute.name
                })
            }
        }
        for (let [key, item] of this._wild) {
            info.push({
                url: item.route.pattern,
                methods: item.route.methods.join(','),
                handler: item.route.execute.name
            })
        }

        return info
    }

    set not_found(func) {
        this._not_found = {
            methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
            session_create: false,
            pattern: '404 - Not Found',
            params: new Map(),
            execute: func
        }
        return this._not_found
    }
    get not_found() {
        return this._not_found
    }

    get_segments = (path) => {
        let c = 0,
            p = -1;
        do {
            c += 1
            p = path.indexOf('/', p + 1)
        } while (p !== -1)
        return c
    }

    transformer_set = (type_code, func) => {
        this._transformers.set(type_code, func)
    }
    transformer_delete = (type_code, func) => {
        this._transformers.delete(type_code, func)
    }

    /*
        rte_obj_cbk is an object or function associated with two strings: method and path
        if object must have a 'execute' function that accepts a context
    */
    add_route = (path, methods, rte_obj_cbk) => {

        if (!Array.isArray(methods) && (typeof methods === 'string')) {
            methods = [methods]
        }

        let route

        if (typeof rte_obj_cbk === 'function') {
            route = {
                methods : methods,
                session_create : true,
                pattern : path,
                params : new Map(),
                execute : rte_obj_cbk
            }
        } else if (typeof rte_obj_cbk === 'object') {
            if (!route.execute) {
               console.log("warning: route object missing .execute method. ")
            }
        }

        let is_vari = path.includes(':'),
            is_wild = path.endsWith('/*');

        // wildcard with variable not allowed ((maybe in future))
        if (is_vari && is_wild) {
            throw new Error('wildcard path cannot have variables')
        }

        // ensure path has leading & trailing
        if (is_wild) {
            path = path.substring(0, path.length - 1) // remove trailing '*'
        }

        // strip leading and trailing
        path = this.clean_path(path)

        // normal path ?
        if (!is_vari && !is_wild) {
            for (let m of methods) {
                this._norm.set(m + ' /' + path, route)
            }
            return route
        }

        // wildcard path ?
        if (is_wild) {
            path = ' /' + path
            for (let m of methods) {  //TODO use info {} like vari map and store length of wild prefix
                this._wild.set(m + path, { wildcard_prefix: path.substring(1), route: route })
            }
            return route
        }

        let segments = path.split('/'),
            seg_count = segments.length,
            fix_parts = [],
            dyn_parts = [],
            prefix = '',
            prefix_complete = false;

        //examine each segment
        segments.forEach((segment, index) => {

            if (segment.startsWith(':') && (segment.includes(':', 1)) !== -1) {  //:var:int is an example
                let p = segment.indexOf(':', 1)
                prefix_complete = true
                dyn_parts.push({
                    index : index,
                    name : segment.substring(1, p),
                    type : segment.substring(p + 1)  //TODO ensure type exists in transformers
                })
            } else {
                if (!prefix_complete) {
                    prefix += segment + '/'
                }
                fix_parts.push({
                    index : index,
                    name : segment,
                    type : ''
                })
            }
        })

        //store variable route info (destructure assignment)
        let info = { prefix, seg_count, dyn_parts, fix_parts, route }

        //multiple http methods may be passed
        for (let m of methods) {
            let key = m + ' ' + seg_count
            let entries = this._vari.get(key) || []
            entries.push(info)
            this._vari.set(key, entries)
        }

        return route

    }

    match = (path, method) => {

        //note paths from http serve will always start with slash
        //ending slash exists if supplied by client...
        //Router strips both for matching...
        path = this.clean_path(path)

        //try matching normal fixed path
        let route = this._norm.get(method + ' /' + path)
        if (route) {
            return route
        }

        //try matching variable path
        //  get all variable route entries with same method and # of segments
        //  could swap key to '# method' instead of 'method #' ... (micro optimiz?)
        const entries = this._vari.get(method + ' ' + this.get_segments(path))

        if (entries) {

            const segments = path.split('/')

            for (const entry of entries) {

                let found = false

                //does path start with entry prefix ?
                //  note 'textvalue'.startsWith('') is always true and needed for single segment variable routes
                if (path.startsWith(entry.prefix)) {

                    //if it has fixed parts - do all the fixed parts match ?
                    if (entry.fixed_parts) {
                        found = true
                        for (let f of entry.fix_parts) {
                            if ( segments[f.index] !== f.name ) {
                                found = false
                                break;
                            }
                        }
                    }

                    if (found || entry.fixed_parts === undefined) {  // set route params
                        let params = entry.route.params,
                            dyn_parts = entry.dyn_parts;

                        params.clear()

                        //TODO: consider 404 when variable segment type does not match pattern
                        //e.g. GET /somepath/:foo:int and GET /somepath/hello
                        //current state - handler must validate.
                        for (let dyn_part of dyn_parts) {
                            let transform = this._transformers.get(dyn_part.type),
                                raw_value = segments[dyn_part.index],
                                new_value = (transform) ? transform(raw_value) : raw_value;
                            params.set(dyn_part.name, new_value)
                        }

                        return entry.route
                    }
                }
            }
        }

        //try matching wildcard
        let p = method + ' /' + path
        for (let [key, info] of this._wild) {
            if (p.startsWith(key)) {
                route = info.route
                route.params.set('wildcard', path.substring(info.wildcard_prefix.length))
                return route
            }
        }

        // No route found...
        // if HEAD check GETs ? ... is configurable - see constructor
        if ((method === 'HEAD') && (this._config.check_head)) {
            route = this.match(path, 'GET')
        }
        return (route) ? route : (this._not_found) ? this._not_found : null
    }

    get = (path, func) => { return this.add_route(path, 'GET', func) }
    put = (path, func) => { return this.add_route(path, 'PUT', func) }
    patch = (path, func) => { return this.add_route(path, 'PATCH', func) }
    post = (path, func) => { return this.add_route(path, 'POST', func) }
    del = (path, func) => { return this.add_route(path, 'DELETE', func) }
    delete = (path, func) => { return this.add_route(path, 'DELETE', func) }
    head = (path, func) => { return this.add_route(path, 'HEAD', func) }
    options = (path, func) => { return this.add_route(path, 'OPTIONS', func) }
}

export {
    Router
}