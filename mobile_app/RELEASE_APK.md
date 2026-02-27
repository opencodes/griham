# Creating a Release Signed APK

This guide walks through generating a release-signed APK for the Griham mobile app.

## Step 1: Generate the Keystore

Navigate to the `android/` directory and run the `keytool` command to create a signing key:

```bash
cd android
keytool -genkey -v -keystore app/key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

You'll be prompted for:
- **Keystore Password** (write this down!)
- **Keystore Password** (confirm)
- **First and Last Name** (your name or organization name)
- **Organizational Unit** (optional, e.g. "Engineering")
- **Organization** (e.g. "Griham Finance")
- **City, State, Country code** (your location)
- **CN=?** (usually same as name)

When asked "Is this correct?" type `yes` and press `[Enter]`.

✅ This creates `android/app/key.jks` containing your release signing key.

---

## Step 2: Add Signing Config to build.gradle.kts

Update `android/app/build.gradle.kts` to configure the release signing:

```kotlin
android {
    // ... existing code ...

    // ADD THIS BLOCK before buildTypes:
    signingConfigs {
        create("release") {
            keyAlias = "release"
            keyPassword = "YOUR_KEY_PASSWORD"
            storeFile = file("key.jks")
            storePassword = "YOUR_KEYSTORE_PASSWORD"
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")  // Change from debug
        }
    }
}
```

⚠️ **Security Note:** Do NOT commit passwords to git. See Step 3 for a safer approach.

---

## Step 3: (Recommended) Use local.properties for Passwords

Create or edit `android/local.properties`:

```properties
flutter.sdk=/path/to/flutter
flutter.buildMode=release
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
```

Update `build.gradle.kts` to read from `local.properties`:

```kotlin
signingConfigs {
    create("release") {
        keyAlias = "release"
        keyPassword = properties["keyPassword"] as String
        storeFile = file("key.jks")
        storePassword = properties["storePassword"] as String
    }
}
```

`local.properties` is already in `.gitignore`, so your passwords stay private.

---

## Step 4: Build the Release APK

From your project root (`mobile_app/griham_mobile_app/`), run:

```bash
flutter build apk --release
```

The signed APK will be generated at:

```
build/app/outputs/apk/release/app-release.apk
```

---

## (Optional) Build App Bundle for Google Play

If you're uploading to the Google Play Store, create an App Bundle instead:

```bash
flutter build appbundle --release
```

This generates:

```
build/app/outputs/bundle/release/app-release.aab
```

---

## Troubleshooting

- **"Keystore file not found"**: Ensure `key.jks` exists in `android/app/`
- **"Invalid keystore password"**: Double-check the password in `local.properties` or `build.gradle.kts`
- **Build fails with Gradle error**: Run `flutter clean` then retry the build command
- **APK not signing**: Verify `signingConfig` is correctly set in the `release` buildType

---

## Verification

To verify the APK is signed correctly:

```bash
jarsigner -verify -verbose build/app/outputs/apk/release/app-release.apk
```

If it shows "jar verified" the signature is valid.
