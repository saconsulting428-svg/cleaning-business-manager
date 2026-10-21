You do NOT need this folder if you use Android Studio's wizard: Build > Generate Signed App Bundle / APK > Android App Bundle > Create new...
(The wizard makes the keystore for you. Save the .jks file and passwords somewhere safe.)

Command-line alternative: run make-keystore.(sh|bat), copy ../keystore.properties.example to ../keystore.properties,
then:  ./gradlew bundleRelease   ->   app/build/outputs/bundle/release/app-release.aab

Use Play App Signing (the default in Play Console): Google keeps the real app-signing key, this is only your UPLOAD key.
