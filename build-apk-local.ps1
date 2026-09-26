$ErrorActionPreference = "Stop"

$workspace = "C:\Users\mit70\healthybit app"
$toolsDir = "$workspace\build-tools"
if (!(Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir | Out-Null }

$jdkUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.14%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.14_7.zip"
$jdkZip = "$toolsDir\jdk17.zip"
$jdkDir = "$toolsDir\jdk-17.0.14+7"

if (!(Test-Path $jdkDir)) {
    Write-Host "Downloading JDK 17 (this may take a minute)..."
    Invoke-WebRequest -Uri $jdkUrl -OutFile $jdkZip
    Write-Host "Extracting JDK 17..."
    Expand-Archive -Path $jdkZip -DestinationPath $toolsDir -Force
}
$env:JAVA_HOME = $jdkDir
Write-Host "JAVA_HOME set to $env:JAVA_HOME"

$cmdUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$cmdZip = "$toolsDir\cmdline-tools.zip"
$sdkDir = "$toolsDir\android-sdk"
$cmdToolsDir = "$sdkDir\cmdline-tools\latest"

if (!(Test-Path $cmdToolsDir)) {
    Write-Host "Downloading Android SDK Command Line Tools..."
    Invoke-WebRequest -Uri $cmdUrl -OutFile $cmdZip
    Write-Host "Extracting Android SDK..."
    Expand-Archive -Path $cmdZip -DestinationPath "$toolsDir\temp-cmd" -Force
    New-Item -ItemType Directory -Path "$sdkDir\cmdline-tools" -Force | Out-Null
    Move-Item -Path "$toolsDir\temp-cmd\cmdline-tools" -Destination $cmdToolsDir -Force
    Remove-Item -Path "$toolsDir\temp-cmd" -Recurse -Force
}

$env:ANDROID_HOME = $sdkDir
$sdkManager = "$cmdToolsDir\bin\sdkmanager.bat"

Write-Host "Accepting Android licenses..."
1..20 | ForEach-Object { "y" } | & $sdkManager --licenses

Write-Host "Installing Android platforms and build tools..."
& $sdkManager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

Write-Host "Setting up local.properties..."
$localProps = "$workspace\android\local.properties"
"sdk.dir=$($sdkDir.Replace('\','\\'))" | Out-File -FilePath $localProps -Encoding ASCII

Write-Host "Building APK..."
Set-Location -Path "$workspace\android"
& .\gradlew.bat assembleDebug

if (Test-Path "$workspace\android\app\build\outputs\apk\debug\app-debug.apk") {
    Write-Host "========================================="
    Write-Host "SUCCESS! APK is ready at:"
    Write-Host "$workspace\android\app\build\outputs\apk\debug\app-debug.apk"
    Write-Host "========================================="
} else {
    Write-Host "APK Build Failed."
}
