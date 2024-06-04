# G9 - a simple NodeJS web ~~framework~~ library #

## Minimal ##

G9 is a minimalist Node.js ~~framework~~ library written by me just to learn and experiment. 

G9 focuses on simplicity and developer experience and includes only essential features needed to get started.

### Features ###

- **Routing:** Simple routing system for handling HTTP requests
- **Static Files with Compression and Cacheing:**
  - Gzip and Brotli compression
  - Etag support 
  - File watcher - auto recompress 
- **Middleware:** Support for 'per Route' unique middleware stacks
- **Error Handling:** All errors bubble to a single block
- **Logging:** Extends console for logging 
- **Sessions:** Simple non-prod session manager based on JS Map
- **Cookies:** Simple cookie manager for session cookies

### Dependencies (Optional) ### 
- postgres by porsager - https://github.com/porsager/postgres
- @fastify/busboy - https://github.com/fastify/busboy



