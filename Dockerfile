FROM lwthiker/curl-impersonate:0.5-chrome AS curl-bin

FROM node:22-alpine

# Install musl-compatible shared libraries needed by curl-impersonate
RUN apk add --no-cache libgcc libstdc++ nghttp2-libs brotli-libs zstd-libs

# Copy curl-impersonate binaries and libraries
COPY --from=curl-bin /usr/local/bin/curl_chrome110 /usr/local/bin/
COPY --from=curl-bin /usr/local/bin/curl-impersonate-chrome /usr/local/bin/
COPY --from=curl-bin /usr/local/lib/libcurl-impersonate* /usr/local/lib/
COPY --from=curl-bin /usr/local/lib/libcurl.* /usr/local/lib/

WORKDIR /app
COPY package.json server.js ./

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
