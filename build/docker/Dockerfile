FROM node:16-alpine

ENV CI_HOME=/usr/local/chip-in

RUN apk update \
  && apk --update add openssl \
  && apk add ca-certificates wget git\
  && update-ca-certificates
RUN mkdir -p ${CI_HOME} \
  && cd ${CI_HOME} \
  && git clone https://github.com/chip-in/hmr.git \
  && rm -rf hmr/.git \
  && cd hmr \
  && npm install \
  && npm run build
WORKDIR ${CI_HOME}/hmr
ENTRYPOINT ["node", "lib/main.js"]