package com.brainbites

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.content.IntentFilter
import android.os.Bundle

class MainActivity : ReactActivity() {

  private var screenReceiver: BrainBitesScreenReceiver? = null

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "BrainBites"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Register screen state receiver
    screenReceiver = BrainBitesScreenReceiver()
    val filter = IntentFilter().apply {
        addAction(android.content.Intent.ACTION_SCREEN_ON)
        addAction(android.content.Intent.ACTION_SCREEN_OFF)
        addAction(android.content.Intent.ACTION_USER_PRESENT)
    }
    registerReceiver(screenReceiver, filter)
  }

  override fun onDestroy() {
    super.onDestroy()
    screenReceiver?.let { unregisterReceiver(it) }
  }
}