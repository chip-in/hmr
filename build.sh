#!/bin/bash
mkdir -p ./rpmbuild/{BUILD/x86_64,RPMS,SOURCES,SPECS,SRPMS}

rpmbuild -bb  -D "CHIP_IN_RELEASE $RELEASE" -D "CHIP_IN_VERSION $VERSION" rpmbuild/SPECS/hmr.spec

