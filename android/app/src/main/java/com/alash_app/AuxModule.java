package com.alash_app;

import android.media.AudioManager;
import android.media.MediaPlayer;
import android.content.Context;
import android.net.Uri;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.io.IOException;

public class AuxModule extends ReactContextBaseJavaModule {
    private MediaPlayer auxPlayer;

    public AuxModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AuxModule";
    }

    @ReactMethod
    public void playUnlockSignal() {
        Context context = getReactApplicationContext();
        int resId = context.getResources().getIdentifier("unlock_signal", "raw", context.getPackageName());
        Uri uri = Uri.parse("android.resource://" + context.getPackageName() + "/" + resId);
        auxPlayer = new MediaPlayer();
        try {
            auxPlayer.setDataSource(context, uri);
            auxPlayer.setAudioStreamType(AudioManager.STREAM_MUSIC); // Можно попробовать STREAM_ALARM для AUX
            auxPlayer.setVolume(1.0f, 1.0f);
            auxPlayer.prepare();
            auxPlayer.start();
        } catch (IOException e) {
            e.printStackTrace();
        }
        auxPlayer.setOnCompletionListener(mp -> {
            mp.release();
        });
    }
}
