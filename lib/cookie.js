'use strict';

// See below
/*
    https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
    https://nodejs.org/api/http.html#responsegetheadername
    Note
        cookie_set algorithm results in multiple 'set-cookie' for a given cookie if called multiple times for the given cookie.
        Modern browsers use the last 'set-cookie' value
    // see https://nodejs.org/dist/latest-v21.x/docs/api/http.html#responsegetheadername
*/
const cookie_set = (response, name, value, domain = null, path = '/', secure = null, http_only = 'HttpOnly', same_site = 'Strict', expires = null, max_age = 0) => {

    let existing = response.getHeader('set-cookie') || [],   // Get qued 'set-cookie' response header
        cookie = name + '=' + value;

    if (expires) cookie += '; Expires=' + value
    if (domain) cookie += '; Domain=' + domain
    if (path) cookie += '; Path=' + path
    if (same_site) cookie += '; Same-Site=' + same_site
    if (expires) cookie += '; Expires=' + expires  //browsers use Expires over Max-Age if both are set
    if (max_age) cookie += '; Max-Age=' + max_age
    if (secure) cookie += '; Secure'
    if (http_only) cookie += '; HttpOnly'

    existing.push(cookie)
    response.setHeader('Set-Cookie', existing)
}

const cookie_get = (request, name) => {
    let sep = '; ',
        all = sep + (request.headers['cookie'] || '') + sep,
        tmp = sep + name + '=',
        found = all.indexOf(tmp);

    if (found === -1) {
        return ''
    } else {
        found += tmp.length
        return all.substring(found, all.indexOf('; ', found))
    }
}

export {
    cookie_get,
    cookie_set,
}