package com.brainbites

import android.app.Activity
import android.app.Application
import android.os.Bundle
import android.content.Intent
import android.util.Log

class BrainBitesLifecycleListener : Application.ActivityLifecycleCallbacks {
    companion object {
        private const val TAG = "BrainBitesLifecycle"
    }

    private var activityReferences = 0
    private var isActivityChangingConfigurations = false

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    
    override fun onActivityStarted(activity: Activity) {
        if (++activityReferences == 1 && !isActivityChangingConfigurations) {
            // App entered foreground
            Log.d(TAG, "BrainBites app entered foreground")
            notifyTimerService(activity, true)
        }
    }
    
    override fun onActivityResumed(activity: Activity) {}
    
    override fun onActivityPaused(activity: Activity) {}
    
    override fun onActivityStopped(activity: Activity) {
        isActivityChangingConfigurations = activity.isChangingConfigurations
        if (--activityReferences == 0 && !isActivityChangingConfigurations) {
            // App entered background
            Log.d(TAG, "BrainBites app entered background")
            notifyTimerService(activity, false)
        }
    }
    
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    
    override fun onActivityDestroyed(activity: Activity) {}

    private fun notifyTimerService(activity: Activity, isForeground: Boolean) {
        try {
            val intent = Intent(activity, BrainBitesTimerService::class.java).apply {
                action = if (isForeground) {
                    BrainBitesTimerService.ACTION_APP_FOREGROUND
                } else {
                    BrainBitesTimerService.ACTION_APP_BACKGROUND
                }
            }
            activity.startService(intent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to notify timer service", e)
        }
    }
}