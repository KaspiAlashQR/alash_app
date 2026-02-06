package com.gomarket

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class ImouPlayerViewManager : SimpleViewManager<ImouPlayerView>() {

    companion object {
        const val REACT_CLASS = "ImouPlayerView"

        // Commands
        const val COMMAND_START_PREVIEW = 1
        const val COMMAND_STOP_PREVIEW = 2
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): ImouPlayerView {
        return ImouPlayerView(reactContext)
    }

    @ReactProp(name = "deviceId")
    fun setDeviceId(view: ImouPlayerView, deviceId: String?) {
        deviceId?.let { view.setDeviceId(it) }
    }

    @ReactProp(name = "channelId", defaultInt = 0)
    fun setChannelId(view: ImouPlayerView, channelId: Int) {
        view.setChannelId(channelId)
    }

    @ReactProp(name = "accessToken")
    fun setAccessToken(view: ImouPlayerView, accessToken: String?) {
        accessToken?.let { view.setAccessToken(it) }
    }

    @ReactProp(name = "playToken")
    fun setPlayToken(view: ImouPlayerView, playToken: String?) {
        playToken?.let { view.setPlayToken(it) }
    }

    @ReactProp(name = "streamType", defaultInt = 1)
    fun setStreamType(view: ImouPlayerView, streamType: Int) {
        view.setStreamType(streamType)
    }

    @ReactProp(name = "password")
    fun setPassword(view: ImouPlayerView, password: String?) {
        password?.let { view.setPassword(it) }
    }

    @ReactProp(name = "productId")
    fun setProductId(view: ImouPlayerView, productId: String?) {
        productId?.let { view.setProductId(it) }
    }

    @ReactProp(name = "autoPlay", defaultBoolean = false)
    fun setAutoPlay(view: ImouPlayerView, autoPlay: Boolean) {
        if (autoPlay) {
            // Delay to ensure all props are set before starting preview
            view.postDelayed({ view.startPreview() }, 500)
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any>? {
        return MapBuilder.builder<String, Any>()
            .put("onPlayStart", MapBuilder.of("registrationName", "onPlayStart"))
            .put("onPlayStop", MapBuilder.of("registrationName", "onPlayStop"))
            .put("onError", MapBuilder.of("registrationName", "onError"))
            .put("onResolutionChanged", MapBuilder.of("registrationName", "onResolutionChanged"))
            .build()
    }

    override fun getCommandsMap(): Map<String, Int>? {
        return MapBuilder.of(
            "startPreview", COMMAND_START_PREVIEW,
            "stopPreview", COMMAND_STOP_PREVIEW
        )
    }

    override fun receiveCommand(view: ImouPlayerView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            COMMAND_START_PREVIEW -> view.startPreview()
            COMMAND_STOP_PREVIEW -> view.stopPreview()
        }
    }

    override fun onDropViewInstance(view: ImouPlayerView) {
        super.onDropViewInstance(view)
        view.release()
    }
}
