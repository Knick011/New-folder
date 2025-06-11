package com.brainbites

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import android.widget.RemoteViews
import java.text.SimpleDateFormat
import java.util.*

class BrainBitesTimerService : Service() {
    
    private lateinit var powerManager: PowerManager
    private lateinit var keyguardManager: KeyguardManager
    private lateinit var sharedPrefs: SharedPreferences
    private lateinit var notificationManager: NotificationManager
    
    private val handler = Handler(Looper.getMainLooper())
    private var timerRunnable: Runnable? = null
    private var wakeLock: PowerManager.WakeLock? = null
    
    private var remainingTimeSeconds = 0
    private var isAppInForeground = false
    private var lastTickTime = 0L
    
    companion object {
        private const val TAG = "BrainBitesTimer"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "brainbites_timer_channel"
        private const val PREFS_NAME = "BrainBitesTimerPrefs"
        private const val KEY_REMAINING_TIME = "remaining_time"
        
        const val ACTION_UPDATE_TIME = "update_time"
        const val ACTION_ADD_TIME = "add_time"
        const val ACTION_STOP_SERVICE = "stop_service"
        const val ACTION_APP_FOREGROUND = "app_foreground"
        const val ACTION_APP_BACKGROUND = "app_background"
        const val ACTION_START_TIMER = "start_timer"
        const val ACTION_STOP_TIMER = "stop_timer"
        const val EXTRA_TIME_SECONDS = "time_seconds"
    }
    
    override fun onCreate() {
        super.onCreate()
        
        powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        sharedPrefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        createNotificationChannel()
        loadSavedTime()
        acquireWakeLock()
        
        // Start the timer immediately if we have time
        if (remainingTimeSeconds > 0) {
            startTimer()
        }
        
        Log.d(TAG, "BrainBitesTimerService created with saved time: $remainingTimeSeconds")
    }

    private fun acquireWakeLock() {
        try {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "$TAG::TimerWakeLock"
            ).apply {
                setReferenceCounted(false)
                acquire(10*60*1000L /*10 minutes*/)
            }
            Log.d(TAG, "Wake lock acquired")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire wake lock", e)
        }
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_UPDATE_TIME -> {
                val timeSeconds = intent.getIntExtra(EXTRA_TIME_SECONDS, 0)
                updateRemainingTime(timeSeconds)
                startTimer()
            }
            ACTION_ADD_TIME -> {
                val timeSeconds = intent.getIntExtra(EXTRA_TIME_SECONDS, 0)
                addTime(timeSeconds)
            }
            ACTION_START_TIMER -> {
                startTimer()
            }
            ACTION_STOP_SERVICE, ACTION_STOP_TIMER -> {
                stopTimer()
                stopSelf()
            }
            ACTION_APP_FOREGROUND -> {
                handleAppForeground()
            }
            ACTION_APP_BACKGROUND -> {
                handleAppBackground()
            }
            else -> {
                // Default action - start timer if we have time
                if (remainingTimeSeconds > 0) {
                    startTimer()
                }
            }
        }
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "BrainBitesTimerService destroyed")
        releaseWakeLock()
        stopTimer()
        saveTime()
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let {
                if (it.isHeld) {
                    it.release()
                    Log.d(TAG, "Wake lock released")
                }
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release wake lock", e)
        }
    }
    
    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "BrainBites Screen Time",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Shows remaining app time"
            setShowBadge(false)
            setSound(null, null)
        }
        notificationManager.createNotificationChannel(channel)
    }
    
    private fun startTimer() {
        Log.d(TAG, "Starting BrainBites timer")
        
        // Start foreground service with initial notification
        startForeground(NOTIFICATION_ID, createNotification())
        
        // Cancel any existing timer
        timerRunnable?.let { handler.removeCallbacks(it) }
        
        // Initialize last tick time
        lastTickTime = System.currentTimeMillis()
        
        // Start new timer that ticks every second
        timerRunnable = object : Runnable {
            override fun run() {
                tick()
                handler.postDelayed(this, 1000)
            }
        }
        handler.post(timerRunnable!!)
        
        broadcastUpdate()
        Log.d(TAG, "Timer started successfully")
    }
    
    private fun stopTimer() {
        Log.d(TAG, "Stopping timer")
        timerRunnable?.let {
            handler.removeCallbacks(it)
            timerRunnable = null
        }
        saveTime()
    }
    
    private fun tick() {
        val currentTime = System.currentTimeMillis()
        val elapsedSeconds = ((currentTime - lastTickTime) / 1000).toInt()
        lastTickTime = currentTime
        
        val isScreenOn = powerManager.isInteractive
        val isLocked = keyguardManager.isKeyguardLocked
        
        // The key fix: Timer should run when:
        // 1. Screen is ON
        // 2. Device is NOT locked
        // 3. BrainBites app is NOT in foreground (i.e., user is using other apps)
        // 4. We have remaining time
        val shouldDeductTime = isScreenOn && !isLocked && !isAppInForeground && remainingTimeSeconds > 0
        
        if (shouldDeductTime && elapsedSeconds > 0) {
            remainingTimeSeconds = maxOf(0, remainingTimeSeconds - elapsedSeconds)
            
            // Log every 10 seconds for debugging
            if (remainingTimeSeconds % 10 == 0) {
                Log.d(TAG, "Timer running: ${formatTime(remainingTimeSeconds)} left")
            }
            
            // Check for low time warnings
            when (remainingTimeSeconds) {
                300 -> showLowTimeNotification(5) // 5 minutes warning
                60 -> showLowTimeNotification(1)   // 1 minute warning
                0 -> handleTimeExpired()
            }
        } else {
            // Log why timer isn't counting
            if (remainingTimeSeconds % 10 == 0 && remainingTimeSeconds > 0) {
                Log.d(TAG, "Timer paused - Screen: $isScreenOn, Locked: $isLocked, BrainBites: ${if (isAppInForeground) "FOREGROUND" else "BACKGROUND"}")
            }
        }
        
        // Update notification every second
        updateNotification()
        
        // Save time every 5 seconds
        if (remainingTimeSeconds % 5 == 0) {
            saveTime()
        }
        
        // Broadcast update every second
        broadcastUpdate()
    }
    
    private fun handleAppForeground() {
        if (!isAppInForeground) {
            isAppInForeground = true
            Log.d(TAG, "BrainBites entered foreground - timer paused")
        }
    }
    
    private fun handleAppBackground() {
        if (isAppInForeground) {
            isAppInForeground = false
            Log.d(TAG, "BrainBites left foreground - timer resumed")
            
            // Ensure timer is running
            if (remainingTimeSeconds > 0 && timerRunnable == null) {
                startTimer()
            }
        }
    }
    
    private fun handleTimeExpired() {
        Log.d(TAG, "Time expired!")
        
        // Show high priority notification
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("⏰ Screen Time Expired!")
            .setContentText("Complete quizzes in BrainBites to earn more time!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .build()
            
        notificationManager.notify(999, notification)
        
        broadcastUpdate()
    }
    
    private fun showLowTimeNotification(minutes: Int) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("⏰ Low Screen Time Warning")
            .setContentText("Only $minutes minute${if (minutes > 1) "s" else ""} remaining!")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_SOUND or NotificationCompat.DEFAULT_VIBRATE)
            .setAutoCancel(true)
            .build()
            
        notificationManager.notify(1000 + minutes, notification)
    }
    
    private fun createNotification(): Notification {
        // Create intent to open BrainBites app
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val timeText = if (remainingTimeSeconds > 0) {
            formatTime(remainingTimeSeconds)
        } else {
            "No time remaining"
        }
        
        val statusText = when {
            remainingTimeSeconds <= 0 -> "Complete quizzes to earn time!"
            isAppInForeground -> "BrainBites Open (Paused)"
            !powerManager.isInteractive -> "Screen Off (Paused)"
            keyguardManager.isKeyguardLocked -> "Device Locked (Paused)"
            else -> "Timer Running"
        }
        
        // Create notification with enhanced styling
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setContentTitle("Screen Time: $timeText")
            .setContentText(statusText)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .setColor(0xFFFF9F1C.toInt()) // Orange color
            .build()
    }
    
    private fun updateNotification() {
        val notification = createNotification()
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private fun updateRemainingTime(newTime: Int) {
        remainingTimeSeconds = newTime
        saveTime()
        Log.d(TAG, "Updated remaining time to $newTime seconds")
    }
    
    private fun addTime(seconds: Int) {
        remainingTimeSeconds += seconds
        saveTime()
        Log.d(TAG, "Added $seconds seconds, new total: $remainingTimeSeconds")
        
        // Start timer if it wasn't running
        if (timerRunnable == null && remainingTimeSeconds > 0) {
            startTimer()
        }
        
        // Update notification immediately
        updateNotification()
        broadcastUpdate()
    }
    
    private fun loadSavedTime() {
        remainingTimeSeconds = sharedPrefs.getInt(KEY_REMAINING_TIME, 0)
        Log.d(TAG, "Loaded saved time: $remainingTimeSeconds seconds")
    }
    
    private fun saveTime() {
        sharedPrefs.edit().putInt(KEY_REMAINING_TIME, remainingTimeSeconds).apply()
    }
    
    private fun broadcastUpdate() {
        val intent = Intent("brainbites_timer_update").apply {
            putExtra("remaining_time", remainingTimeSeconds)
            putExtra("is_app_foreground", isAppInForeground)
            putExtra("is_tracking", !isAppInForeground && powerManager.isInteractive && !keyguardManager.isKeyguardLocked)
        }
        sendBroadcast(intent)
    }
    
    private fun formatTime(seconds: Int): String {
        val hours = seconds / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        
        return when {
            hours > 0 -> String.format("%d:%02d:%02d", hours, minutes, secs)
            else -> String.format("%d:%02d", minutes, secs)
        }
    }
}