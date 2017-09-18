#!/bin/bash
mkdir -p ./rpmbuild/{BUILD/x86_64,RPMS,SOURCES,SPECS,SRPMS}

rpmbuild -bb rpmbuild/SPECS/hmr.spec

