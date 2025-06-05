package com.brainbites

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BrainBitesTimerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var timerReceiver: BroadcastReceiver? = null
    private val TAG = "BrainBitesTimerModule"

    override fun getName(): String {
        return "BrainBitesTimer"
    }

    @ReactMethod
    fun setScreenTime(seconds: Int) {
        Log.d(TAG, "Setting screen time to $seconds seconds")
        
        val intent = Intent(reactApplicationContext, BrainBitesTimerService::class.java).apply {
            action = BrainBitesTimerService.ACTION_UPDATE_TIME
            putExtra(BrainBitesTimerService.EXTRA_TIME_SECONDS, seconds)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun addTime(seconds: Int) {
        Log.d(TAG, "Adding $seconds seconds to timer")
        
        val intent = Intent(reactApplicationContext, BrainBitesTimerService::class.java).apply {
            action = BrainBitesTimerService.ACTION_ADD_TIME
            putExtra(BrainBitesTimerService.EXTRA_TIME_SECONDS, seconds)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun startTracking() {
        Log.d(TAG, "Starting timer tracking")
        
        val intent = Intent(reactApplicationContext, BrainBitesTimerService::class.java).apply {
            action = BrainBitesTimerService.ACTION_START_TIMER
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopTracking() {
        Log.d(TAG, "Stopping timer tracking")
        
        val intent = Intent(reactApplicationContext, BrainBitesTimerService::class.java).apply {
            action = BrainBitesTimerService.ACTION_STOP_TIMER
        }
        
        reactApplicationContext.startService(intent)
    }

    @ReactMethod
    fun getRemainingTime(promise: Promise) {
        val sharedPrefs = reactApplicationContext.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
        val remainingTime = sharedPrefs.getInt("remaining_time", 0)
        promise.resolve(remainingTime)
    }

    @ReactMethod
    fun startListening() {
        Log.d(TAG, "Starting to listen for timer updates")
        
        if (timerReceiver != null) {
            return // Already listening
        }
        
        timerReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                intent?.let {
                    val remainingTime = it.getIntExtra("remaining_time", 0)
                    val isAppForeground = it.getBooleanExtra("is_app_foreground", false)
                    val isTracking = it.getBooleanExtra("is_tracking", false)
                    
                    sendEvent("timerUpdate", Arguments.createMap().apply {
                        putInt("remainingTime", remainingTime)
                        putBoolean("isAppForeground", isAppForeground)
                        putBoolean("isTracking", isTracking)
                    })
                }
            }
        }
        
        val filter = IntentFilter("brainbites_timer_update")
        ContextCompat.registerReceiver(
            reactApplicationContext, 
            timerReceiver, 
            filter, 
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    @ReactMethod
    fun stopListening() {
        Log.d(TAG, "Stopping timer update listener")
        
        timerReceiver?.let { 
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering receiver", e)
            }
            timerReceiver = null
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun notifyAppState(state: String) {
        Log.d(TAG, "App state notification: $state")
        
        val intent = Intent(reactApplicationContext, BrainBitesTimerService::class.java).apply {
            action = when(state) {
                "app_foreground" -> BrainBitesTimerService.ACTION_APP_FOREGROUND
                "app_background" -> BrainBitesTimerService.ACTION_APP_BACKGROUND
                else -> return
            }
        }
        
        reactApplicationContext.startService(intent)
    }
}