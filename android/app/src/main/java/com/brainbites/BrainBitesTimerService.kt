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
    private var appForegroundStartTime = 0L
    private var isAppInForeground = false
    private var lastTickTime = 0L
    
    // Event log for debugging
    private val eventLog = mutableListOf<String>()
    private val maxLogEntries = 5
    
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
        
        Log.d(TAG, "BrainBitesTimerService created with saved time: $remainingTimeSeconds")
        addLogEntry("Timer service started")
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
        addLogEntry("Timer started")
    }
    
    private fun stopTimer() {
        Log.d(TAG, "Stopping timer")
        timerRunnable?.let {
            handler.removeCallbacks(it)
            timerRunnable = null
        }
        saveTime()
        addLogEntry("Timer stopped")
    }
    
    private fun tick() {
        val currentTime = System.currentTimeMillis()
        val elapsedSeconds = ((currentTime - lastTickTime) / 1000).toInt()
        lastTickTime = currentTime
        
        val isScreenOn = powerManager.isInteractive
        val isLocked = keyguardManager.isKeyguardLocked
        
        // Only count down if:
        // 1. Screen is ON
        // 2. Device is NOT locked
        // 3. BrainBites app is NOT in foreground
        // 4. We have remaining time
        val shouldDeductTime = isScreenOn && !isLocked && !isAppInForeground && remainingTimeSeconds > 0
        
        if (shouldDeductTime && elapsedSeconds > 0) {
            remainingTimeSeconds = maxOf(0, remainingTimeSeconds - elapsedSeconds)
            
            // Log every 30 seconds
            if (remainingTimeSeconds % 30 == 0) {
                addLogEntry("Tracking: ${formatTime(remainingTimeSeconds)} left")
            }
            
            // Check for low time warnings
            when (remainingTimeSeconds) {
                300 -> showLowTimeNotification(5) // 5 minutes warning
                60 -> showLowTimeNotification(1)   // 1 minute warning
                0 -> handleTimeExpired()
            }
        }
        
        // Update notification every second for live countdown
        updateNotification()
        
        // Save time every 10 seconds
        if (remainingTimeSeconds % 10 == 0) {
            saveTime()
        }
        
        // Broadcast update every second
        broadcastUpdate()
    }
    
    private fun handleAppForeground() {
        if (!isAppInForeground) {
            isAppInForeground = true
            appForegroundStartTime = System.currentTimeMillis()
            addLogEntry("BrainBites opened (timer paused)")
            Log.d(TAG, "BrainBites entered foreground - timer paused")
        }
    }
    
    private fun handleAppBackground() {
        if (isAppInForeground) {
            isAppInForeground = false
            
            // Don't add back time for BrainBites - it's a learning app
            addLogEntry("BrainBites minimized (timer resumed)")
            Log.d(TAG, "BrainBites left foreground - timer resumed")
            
            saveTime()
        }
    }
    
    private fun handleTimeExpired() {
        Log.d(TAG, "Time expired!")
        addLogEntry("⏰ TIME EXPIRED!")
        
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
            !powerManager.isInteractive -> "Screen Off"
            keyguardManager.isKeyguardLocked -> "Device Locked"
            else -> "Tracking Screen Time"
        }
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setContentTitle("App Time: $timeText")
            .setContentText(statusText)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setSilent(true)
            .build()
    }
    
    private fun updateNotification() {
        val notification = createNotification()
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private fun updateRemainingTime(newTime: Int) {
        remainingTimeSeconds = newTime
        saveTime()
        addLogEntry("Time set to ${formatTime(newTime)}")
        Log.d(TAG, "Updated remaining time to $newTime seconds")
    }
    
    private fun addTime(seconds: Int) {
        remainingTimeSeconds += seconds
        saveTime()
        addLogEntry("+${seconds}s added (${formatTime(remainingTimeSeconds)} total)")
        Log.d(TAG, "Added $seconds seconds, new total: $remainingTimeSeconds")
        
        // Start timer if it wasn't running
        if (timerRunnable == null && remainingTimeSeconds > 0) {
            startTimer()
        }
        
        // Update notification immediately
        updateNotification()
        broadcastUpdate()
    }
    
    private fun addLogEntry(message: String) {
        val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val entry = "$timestamp: $message"
        
        eventLog.add(entry)
        
        // Keep only last N entries
        if (eventLog.size > maxLogEntries) {
            eventLog.removeAt(0)
        }
        
        Log.d(TAG, "Event: $entry")
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