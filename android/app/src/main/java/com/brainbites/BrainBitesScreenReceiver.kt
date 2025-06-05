package com.brainbites

import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log

class BrainBitesScreenReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BrainBitesScreen"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received screen action: $action")
        
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        
        val isScreenOn = powerManager.isInteractive
        val isLocked = keyguardManager.isKeyguardLocked
        
        when (action) {
            Intent.ACTION_SCREEN_OFF -> {
                Log.d(TAG, "Screen turned OFF - timer should pause")
                handleScreenStateChange(context, false, true)
            }
            
            Intent.ACTION_SCREEN_ON -> {
                Log.d(TAG, "Screen turned ON - locked: $isLocked")
                handleScreenStateChange(context, true, isLocked)
            }
            
            Intent.ACTION_USER_PRESENT -> {
                Log.d(TAG, "Device unlocked - timer should resume")
                handleScreenStateChange(context, true, false)
            }
        }
    }
    
    private fun handleScreenStateChange(context: Context, isScreenOn: Boolean, isLocked: Boolean) {
        // Get current available time from shared preferences
        val sharedPrefs = context.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
        val availableTime = sharedPrefs.getInt("remaining_time", 0)
        
        // Timer should run only if screen is on, device is unlocked, and we have time
        val shouldTimerRun = isScreenOn && !isLocked && availableTime > 0
        
        Log.d(TAG, "Timer decision - Should run: $shouldTimerRun (Screen: $isScreenOn, Locked: $isLocked, Time: ${availableTime}s)")
        
        if (shouldTimerRun) {
            val serviceIntent = Intent(context, BrainBitesTimerService::class.java).apply {
                action = BrainBitesTimerService.ACTION_START_TIMER
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}