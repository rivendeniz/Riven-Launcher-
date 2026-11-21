package com.riven.launcher;

import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String URL_HOME = "http://127.0.0.1:8780/";
    private static final int PICK = 77;
    private WebView web;
    private ValueCallback<Uri[]> chooser;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0B12);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("127.0.0.1".equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;   // dis baglantilar (Modrinth vb.) telefonun tarayicisinda acilir
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try { startActivityForResult(i, PICK); } catch (Exception e) { chooser = null; return false; }
                return true;
            }
        });
        new Thread(this::boot).start();
    }

    private void boot() {
        try {
            File base = new File(getFilesDir(), "riven_base");
            long stamp = getPackageManager().getPackageInfo(getPackageName(), 0).lastUpdateTime;
            File marker = new File(getFilesDir(), "riven_base.stamp");
            if (!base.isDirectory() || !marker.isFile() || !String.valueOf(stamp).equals(readText(marker))) {
                deleteTree(base);
                for (String name : new String[]{"web", "mods", "riven_pack", "riven.ico"}) {
                    copyAsset(getAssets(), name, new File(base, name));
                }
                writeText(marker, String.valueOf(stamp));
            }
            if (!Python.isStarted()) Python.start(new AndroidPlatform(this));
            Python.getInstance().getModule("android_main").callAttr("start", base.getAbsolutePath());
            for (int i = 0; i < 120; i++) {   // sunucu hazir olana kadar bekle (en fazla ~60 sn)
                if (serverUp()) break;
                Thread.sleep(500);
            }
            runOnUiThread(() -> web.loadUrl(URL_HOME));
        } catch (Throwable t) {
            final String msg = "Riven baslatilamadi:\n" + t;
            runOnUiThread(() -> {
                TextView tv = new TextView(this);
                tv.setText(msg);
                tv.setPadding(40, 80, 40, 40);
                setContentView(tv);
            });
        }
    }

    private boolean serverUp() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(URL_HOME).openConnection();
            c.setConnectTimeout(500);
            c.setReadTimeout(1000);
            int code = c.getResponseCode();
            c.disconnect();
            return code == 200;
        } catch (Exception e) {
            return false;
        }
    }

    private static void copyAsset(AssetManager am, String path, File dest) throws Exception {
        String[] kids = am.list(path);
        if (kids != null && kids.length > 0) {
            dest.mkdirs();
            for (String k : kids) copyAsset(am, path + "/" + k, new File(dest, k));
        } else {
            dest.getParentFile().mkdirs();
            try (InputStream in = am.open(path); OutputStream out = new FileOutputStream(dest)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
        }
    }

    private static void deleteTree(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        f.delete();
    }

    private static String readText(File f) throws Exception {
        try (java.io.BufferedReader r = new java.io.BufferedReader(new java.io.FileReader(f))) {
            String l = r.readLine();
            return l == null ? "" : l;
        }
    }

    private static void writeText(File f, String s) throws Exception {
        try (OutputStream out = new FileOutputStream(f)) { out.write(s.getBytes()); }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK && chooser != null) {
            Uri[] r = (res == RESULT_OK && data != null && data.getData() != null) ? new Uri[]{data.getData()} : null;
            chooser.onReceiveValue(r);
            chooser = null;
        }
        super.onActivityResult(req, res, data);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack(); else moveTaskToBack(true);
    }
}
