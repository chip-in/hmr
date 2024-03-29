FROM centos:7
MAINTAINER "Mitsuru Nakakawaji" <mitsuru@procube.jp>
RUN groupadd -g 111 builder
RUN useradd -g builder -u 111 builder

ENV PATH=/usr/local/nodejs/bin:/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin
RUN mkdir -p /tmp/buffer/hmr
ENV NODEJS_VERSION=v16.14.0

RUN yum -y update \
  && yum -y install unzip wget sudo lsof openssh-clients telnet bind-utils tar tcpdump vim initscripts \
  gcc openssl-devel zlib-devel pcre-devel lua lua-devel rpmdevtools make deltarpm \
  systemd-devel chrpath doxygen unixODBC-devel httpd-devel xerces-c-devel gcc-c++ boost-devel

RUN cd /usr/local \
  && curl -s -L -O https://nodejs.org/dist/${NODEJS_VERSION}/node-${NODEJS_VERSION}-linux-x64.tar.xz \
  && tar xf node-${NODEJS_VERSION}-linux-x64.tar.xz \
  && mv node-${NODEJS_VERSION}-linux-x64 nodejs


ENV HOME /home/builder
WORKDIR ${HOME}
USER builder
RUN mkdir -p ${HOME}/rpmbuild/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

COPY . ${HOME}/rpmbuild/SOURCES/hmr
COPY build/rpm/build.sh .
COPY build/rpm/hmr.spec ${HOME}/rpmbuild/SPECS

CMD ["/bin/bash", "./build.sh"]
