package com.ifbank.quiz;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/** 国际金融题库 - WebView 容器 */
public class MainActivity extends Activity {

    private WebView webView;
    private long lastBackPress = 0;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 状态栏配色（仅 Lollipop+）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window w = getWindow();
            w.setStatusBarColor(Color.parseColor("#1E5EFF"));
        }

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);              // localStorage 保存进度所需
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false); // 允许自动播放内嵌音频
        s.setTextZoom(100);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        // 缓存策略：本地资源为主
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        // 暴露原生桥（供页面提示等使用）
        webView.addJavascriptInterface(new JsBridge(), "NativeApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // 仅允许本地与 data，拦截外部跳转
                String url = request.getUrl().toString();
                if (url.startsWith("file:///android_asset/") || url.startsWith("data:")) {
                    return false;
                }
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
        // 加载本地 assets 中的题库程序
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    /** JS 桥：提供 Toast 提示与音频就绪确认 */
    public class JsBridge {
        @JavascriptInterface
        public void toast(String msg) {
            Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show();
        }
        @JavascriptInterface
        public String getAppVersion() {
            return "1.2.0";
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // 若页面内有返回逻辑，先交给 H5 处理
            webView.evaluateJavascript(
                "(function(){ if(window.__app && window.__app.onBack) return window.__app.onBack(); return false; })()",
                value -> {
                    boolean handled = "true".equals(value);
                    if (!handled) {
                        long now = System.currentTimeMillis();
                        if (now - lastBackPress < 2000) {
                            finish();
                        } else {
                            lastBackPress = now;
                            Toast.makeText(MainActivity.this, "再按一次退出", Toast.LENGTH_SHORT).show();
                        }
                    }
                });
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
