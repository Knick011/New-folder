package com.brainbites

import android.app.Application
import android.content.IntentFilter
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  private var screenReceiver: BrainBitesScreenReceiver? = null

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Add BrainBitesTimerPackage
              add(BrainBitesTimerPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    
    // Register lifecycle listener
    registerActivityLifecycleCallbacks(BrainBitesLifecycleListener())
    
    // Register screen state receiver
    screenReceiver = BrainBitesScreenReceiver()
    val filter = IntentFilter().apply {
        addAction(android.content.Intent.ACTION_SCREEN_ON)
        addAction(android.content.Intent.ACTION_SCREEN_OFF)
        addAction(android.content.Intent.ACTION_USER_PRESENT)
    }
    registerReceiver(screenReceiver, filter)
  }

  override fun onTerminate() {
    super.onTerminate()
    screenReceiver?.let { unregisterReceiver(it) }
  }
}