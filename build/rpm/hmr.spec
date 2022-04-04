Name:			hmr
Version: 		%{CHIP_IN_VERSION}
Release: 		%{CHIP_IN_RELEASE}%{?dist}
Group: 			Applications/System
Summary:		Chip-in HMR
Packager:		Mitsuru Nakakawaji
License:		Mitsuru Nakakawaji
Source:			hmr
BuildArch:		x86_64

%define installdir /usr/local/chip-in/
%define systemddir /usr/lib/systemd/system/

%description
This is chip-in hmr package .

%prep

%build

%install
rm -rf $RPM_BUILD_ROOT
mkdir -p $RPM_BUILD_ROOT%{installdir}/ $RPM_BUILD_ROOT%{systemddir}
cp -pr $RPM_SOURCE_DIR/hmr $RPM_BUILD_ROOT%{installdir}/ \
  && cd $RPM_BUILD_ROOT%{installdir}/hmr \
  && npm install \
  && npm run cleanbuild \
  && chmod +x env.sh \
  && chmod +x bin/hmradmin.js

find $RPM_BUILD_ROOT%{installdir}/ -type f | xargs -i sed -i -e "s/$(echo "$RPM_BUILD_ROOT" | sed -e "s/\//\\\\\//g")//g" {}
cp $RPM_SOURCE_DIR/hmr/hmr.service $RPM_BUILD_ROOT%{systemddir}/

%pre


%post
systemctl daemon-reload
ln -s %{installdir}/hmr/bin/hmradmin.js /usr/local/bin/hmradmin

%preun

%clean
rm -rf $RPM_BUILD_ROOT


%files

%defattr(-,root,root)
%{installdir}/hmr/
%attr(755,root,root) %{installdir}/hmr/env.sh
%attr(755,root,root) %{installdir}/hmr/bin/hmradmin.js
%{systemddir}/hmr.service
