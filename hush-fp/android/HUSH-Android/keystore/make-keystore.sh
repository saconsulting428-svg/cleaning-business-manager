#!/bin/sh
# Creates your Play Store UPLOAD keystore (needs a JDK: keytool). Run from the project root:  sh keystore/make-keystore.sh
keytool -genkeypair -v -keystore keystore/hush-upload.jks -alias hush -keyalg RSA -keysize 2048 -validity 10000
echo "Now copy keystore.properties.example to keystore.properties and fill in the passwords you just typed."
