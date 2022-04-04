FROM node:16-alpine

ENV CI_HOME=/usr/local/chip-in
ENV HMR_VERSION=0.6

RUN apk update \
  && apk --update add openssl \
  && apk add ca-certificates wget \
  && update-ca-certificates
RUN mkdir -p ${CI_HOME} \
  && cd ${CI_HOME} \
  && wget -qO - https://github.com/chip-in/hmr/archive/${HMR_VERSION}.tar.gz | tar zxf - \
  && ln -s hmr-${HMR_VERSION} hmr \
  && cd hmr \
  && npm install \
  && npm run build
WORKDIR ${CI_HOME}/hmr
ENTRYPOINT ["node", "lib/main.js"]