FROM node:16-alpine

ENV CI_HOME=/usr/local/chip-in

RUN apk update \
  && apk --update add openssl \
  && apk add ca-certificates wget git\
  && update-ca-certificates \
  && mkdir -p ${CI_HOME}

COPY . ${CI_HOME}/hmr
RUN cd ${CI_HOME}/hmr \
  && rm -rf .git \
  && npm install \
  && npm run build
WORKDIR ${CI_HOME}/hmr
ENTRYPOINT ["node", "lib/main.js"]