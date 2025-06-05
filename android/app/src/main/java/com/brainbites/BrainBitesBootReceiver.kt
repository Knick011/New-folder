package com.brainbites

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class BrainBitesBootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BrainBitesBootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED -> {
                Log.d(TAG, "Device booted - checking for saved timer")
                
                val sharedPrefs = context.getSharedPreferences("BrainBitesTimerPrefs", Context.MODE_PRIVATE)
                val remainingTime = sharedPrefs.getInt("remaining_time", 0)
                
                if (remainingTime > 0) {
                    Log.d(TAG, "Found remaining time: $remainingTime seconds - starting service")
                    
                    val serviceIntent = Intent(context, BrainBitesTimerService::class.java).apply {
                        action = BrainBitesTimerService.ACTION_UPDATE_TIME
                        putExtra(BrainBitesTimerService.EXTRA_TIME_SECONDS, remainingTime)
                    }
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                }
            }
        }
    }
}