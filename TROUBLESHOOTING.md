# Auto-Cleanup Troubleshooting Guide

## ✅ What Was Fixed

### Issue: Auto-cleanup wasn't working
**Root Cause:** All three components were using different channel names:
- LED Control Panel: `"user-presence"` ❌
- Admin Panel: `"admin-presence-monitor"` ❌
- Arduino Client: `"arduino-presence-monitor"` ❌

**Solution:** All now use the same channel: `"led-group-presence"` ✅

## 🧪 Testing the Fix

### Step 1: Test Presence System
1. Open: `http://localhost:3000/presence-test`
2. Click "Run Diagnostic Test"
3. Check that `realtimeTest.success` is `true`
4. Open the page in 2-3 browser tabs
5. Watch "Users Online" count increase
6. Close one tab and watch for "User left" event

### Step 2: Test Auto-Cleanup
1. **Terminal 1:** Start Arduino client
   ```bash
   cd d:\arduino-self-demo
   node index.js
   ```
   You should see:
   ```
   [ARDUINO-MONITOR] Channel subscription status: SUBSCRIBED
   [ARDUINO-MONITOR] ✅ Successfully subscribed to presence channel
   ```

2. **Terminal 2:** Start web app
   ```bash
   cd client\my-app
   npm run dev
   ```

3. **Browser 1:** Open admin panel
   - URL: `http://localhost:3000/admin`
   - Enable "Auto-Cleanup: ON"
   - Check activity log shows: "🔗 Connected to presence monitoring channel"

4. **Browser 2:** Open main LED interface
   - URL: `http://localhost:3000`
   - Check browser console (F12) shows:
     ```
     [LED-PANEL] Channel subscription status: SUBSCRIBED
     [LED-PANEL] Initial presence tracked
     ```

5. **Test disconnect:**
   - Select a group (it locks)
   - **Close Browser 2 tab completely**
   - Watch **Terminal 1** (Arduino) - should show:
     ```
     [ARDUINO-MONITOR] User left: user-xxxxx
     [ARDUINO-MONITOR] User disconnected from group X, initiating cleanup...
     [ARDUINO-MONITOR] Turning off X LEDs for group "..."
     [ARDUINO-MONITOR] ✅ Successfully cleaned up group "..." (X LEDs turned off)
     ```
   - Watch **Browser 1** (Admin) - activity log should show:
     ```
     👤 User disconnected from "Group Name"
     ✅ Auto-cleanup: "Group Name" unlocked, X LEDs off
     ```

## 🔍 Debugging Checklist

### 1. Check Supabase Realtime is Enabled
- Go to: https://supabase.com/dashboard
- Select your project: `lyoeyhpxgwniequxczrs`
- Go to: Settings → API
- Scroll to "Realtime" section
- Ensure it's enabled ✅

### 2. Check Environment Variables
```bash
# In client/my-app/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://lyoeyhpxgwniequxczrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Check Console Logs

**Arduino Client (node index.js):**
- ✅ `[ARDUINO-MONITOR] Channel subscription status: SUBSCRIBED`
- ✅ `[ARDUINO-MONITOR] Presence sync: X users online`

**Admin Panel (Browser Console):**
- ✅ `[ADMIN] Channel subscription status: SUBSCRIBED`
- ✅ `[ADMIN] Presence sync: X users online`

**LED Control Panel (Browser Console):**
- ✅ `[LED-PANEL] Channel subscription status: SUBSCRIBED`
- ✅ `[LED-PANEL] Initial presence tracked`

### 4. Common Issues

#### Issue: "Channel subscription timeout"
**Cause:** Supabase Realtime not enabled or network issue
**Fix:**
1. Run diagnostic: `http://localhost:3000/api/diagnostic`
2. Check `realtimeTest.success` in response
3. If false, enable Realtime in Supabase dashboard

#### Issue: "User left event not firing"
**Cause:** Presence not being tracked properly
**Fix:**
1. Check browser console for "[LED-PANEL] Initial presence tracked"
2. Ensure `presenceChannelRef.current.track()` is being called
3. Try refreshing the page

#### Issue: "Cleanup happens but LEDs don't turn off"
**Cause:** Arduino client not receiving commands
**Fix:**
1. Check Arduino is connected: Look for "Serial port open" in node console
2. Verify COM port is correct (COM3)
3. Check LED-to-Pin mapping in index.js

#### Issue: "Multiple cleanups triggered for same disconnect"
**Cause:** Both admin panel and Arduino are detecting the disconnect (this is normal!)
**Fix:** This is actually redundancy - both can trigger cleanup independently
- Arduino handles hardware (LEDs)
- Admin/API handles database
- This ensures cleanup even if one fails

## 📊 Expected Behavior

### Normal Flow:
1. User opens LED panel → Presence tracked ✅
2. User selects group → Group locked, presence updated with groupId ✅
3. User closes browser → Presence leave event fires ✅
4. Arduino client detects → Turns off LEDs ✅
5. Admin panel detects (if open) → Calls cleanup API ✅
6. Group unlocked in database ✅
7. LEDs are off ✅

### Redundancy:
- **If Arduino client is running:** LEDs turn off + DB unlocked ✅
- **If Admin panel is open:** Cleanup API called ✅
- **If both running:** Both trigger cleanup (safe, idempotent) ✅
- **If neither running:** Cleanup may not happen ❌
  - **Solution:** Keep Arduino client (`node index.js`) running at all times

## 🎯 Best Practices for Exhibition

1. **Always run Arduino client first:**
   ```bash
   node index.js
   ```
   Leave this running throughout the exhibition

2. **Keep admin panel open on a staff device:**
   - Provides monitoring
   - Acts as backup for cleanup
   - Shows real-time activity

3. **Test before exhibition:**
   - Use `/presence-test` page
   - Verify multiple tabs work
   - Test disconnect cleanup

4. **Monitor logs:**
   - Arduino terminal shows all LED commands
   - Admin panel shows all user activity
   - Browser console shows detailed debugging

## 🚨 Emergency Procedures

### All Groups Locked, Cleanup Not Working:
1. Open: `http://localhost:3000/admin`
2. Click "Unlock All (X)"
3. This manually unlocks all groups

### Arduino Not Responding:
1. Stop node process (Ctrl+C)
2. Unplug Arduino
3. Wait 5 seconds
4. Plug in Arduino
5. Run `node index.js` again

### Check if Everything is Working:
```bash
# Run diagnostic
curl http://localhost:3000/api/diagnostic
```

Look for:
- `"realtimeTest": { "success": true }`
- All groups should have entries in `groupUsage`

## 📝 Testing Script

```bash
# Terminal 1: Start Arduino
cd d:\arduino-self-demo
node index.js

# Terminal 2: Start Web App
cd client\my-app
npm run dev

# Browser: Test presence
# 1. Open http://localhost:3000/presence-test
# 2. Open in 2 tabs
# 3. Close one tab
# 4. Verify "User left" appears

# Browser: Test auto-cleanup
# 1. Open http://localhost:3000/admin (enable auto-cleanup)
# 2. Open http://localhost:3000 in another tab
# 3. Select a group (locks)
# 4. Close the tab
# 5. Check admin log for auto-cleanup message
# 6. Check Arduino terminal for LED off commands
```

## ✅ Success Indicators

All of these should be true:
- ✅ `/presence-test` shows "SUBSCRIBED" status
- ✅ Diagnostic shows `realtimeTest.success: true`
- ✅ Arduino console shows "Successfully subscribed to presence channel"
- ✅ Opening multiple tabs increases "Users Online" count
- ✅ Closing a tab triggers "User left" event
- ✅ Locked group auto-unlocks when user disconnects
- ✅ LEDs turn off when cleanup happens

If all of these work, your auto-cleanup system is fully functional! 🎉
