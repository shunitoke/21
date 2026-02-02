# Add Android Microphone Permission

Add `RECORD_AUDIO` permission to `AndroidManifest.xml` to enable microphone access on Android devices.

## Current State
The `AndroidManifest.xml` at `d:\_projects\CursorProjects\21\android\app\src\main\AndroidManifest.xml` only has `INTERNET` permission declared.

## Required Change
Add the following permission line after the `INTERNET` permission:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## Files to Modify
- `d:\_projects\CursorProjects\21\android\app\src\main\AndroidManifest.xml`

## Verification
After adding the permission, rebuild the Android app and test microphone recording in the journal feature.
