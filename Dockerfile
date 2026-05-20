FROM lwthiker/curl-impersonate:0.5-chrome AS curl-bin

FROM node:22-slim

# Copy curl-impersonate binaries and libraries
COPY --from=curl-bin /usr/local/bin/curl_chrome110 /usr/local/bin/
COPY --from=curl-bin /usr/local/bin/curl-impersonate-chrome /usr/local/bin/
COPY --from=curl-bin /usr/local/lib/libcurl-impersonate* /usr/local/lib/
COPY --from=curl-bin /usr/local/lib/libcurl.* /usr/local/lib/

# Copy shared libraries needed by curl-impersonate
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
    libnss3 libnspr4 libbrotli1 libnghttp2-14 libzstd1 \
    && rm -rf /var/lib/apt/lists/*

RUN ldconfig

WORKDIR /app
COPY package.json server.js ./

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
