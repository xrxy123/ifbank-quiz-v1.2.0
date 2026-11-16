# 国际金融题库 · Android 工程

基于 WebView 的离线题库 App，全部网页、题库数据、音频、图标均已内嵌，安装后无需联网即可使用。

## 项目结构

```
android/
├── app/
│   ├── ifbank.jks                   固定签名密钥（保证覆盖安装）
│   ├── build.gradle                 编译配置 + 签名配置
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/ifbank/quiz/MainActivity.java
│       ├── res/                     应用图标（各密度）+ 主题
│       └── assets/www/              完整网页程序
│           ├── index.html
│           ├── bank.js              题库数据（内嵌）
│           ├── audio/               语音提示/背景音/音效（内嵌）
│           └── *.js / *.css
├── .github/workflows/build-apk.yml   GitHub 自动构建配置
├── settings.gradle / build.gradle
└── gradle/wrapper/
```

## 用 GitHub Actions 出包（推荐）

1. 把本 `android/` 目录的内容上传到一个 GitHub 仓库的**根目录**
   （即仓库根目录直接能看到 `settings.gradle`、`app\`、`.github\`）。
2. 进入仓库 → **Actions** → **Build 国际金融题库 APK** → **Run workflow**。
3. 构建完成后，在本次运行的 **Artifacts** 中下载 `国际金融题库_APK`，解压得到签名 APK。

> 由于签名密钥 `ifbank.jks` 已随工程提供且密码固定，新旧版本签名一致，可直接覆盖安装。

## 本地构建（可选）

需要本机安装 JDK 17 与 Android SDK（platform 34、build-tools 34）：

```bash
gradle :app:assembleRelease --no-daemon
```

产物：`app/build/outputs/apk/release/`

## 版本信息

- 包名：`com.ifbank.quiz`
- versionCode：1 / versionName：1.0.0
- 最低 Android 5.0（API 21），目标 Android 14（API 34）
