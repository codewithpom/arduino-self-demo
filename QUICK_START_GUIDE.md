# Quick Start Guide - Auto-Cleanup System

## For School Exhibition

### Step 1: Start the Arduino Client
```bash
cd d:\arduino-self-demo
node index.js
```

You should see:
```
Serial port open
Starting laptop client...
[MONITOR] Presence monitoring enabled - will auto-cleanup on user disconnect
```

### Step 2: Start the Web Application
```bash
cd client\my-app
npm run dev
```

### Step 3: Open Admin Panel
1. Open your browser
2. Navigate to `http://localhost:3000/admin`
3. Click "Auto-Cleanup: ON" button

### Step 4: Open Visitor Interface
- Visitors can use: `http://localhost:3000`
- Or open on multiple devices/tablets

## What Happens When a Visitor Disconnects?

### Scenario 1: Visitor closes browser tab
1. ✅ Supabase presence detects disconnect
2. ✅ Admin panel (if open) receives leave event
3. ✅ Arduino client also receives leave event
4. ✅ Either one triggers cleanup:
   - Turns off all LEDs in the locked group
   - Unlocks the group in database
5. ✅ Group becomes available for next visitor

### Scenario 2: Visitor's device crashes/battery dies
1. ✅ Same as Scenario 1
2. ✅ Supabase presence timeout (default: 30 seconds)
3. ✅ Automatic cleanup triggered

### Scenario 3: Network interruption
1. ✅ Presence heartbeat fails
2. ✅ After timeout, treated as disconnect
3. ✅ Cleanup triggered

## Admin Panel Features

### Monitor Tab
- See all groups and their status
- Real-time updates every 5 seconds
- Activity log shows all events

### Manual Controls
- **Unlock Individual Group**: Click "Unlock" on any locked group
- **Unlock All**: Emergency unlock for all groups
- **Refresh**: Manually refresh group status

### Group Management
- **Create**: Click "Create Group"
  - Enter group name (e.g., "Arms and Legs")
  - Enter LED numbers (e.g., "1, 2, 3, 4")
- **Edit**: Click pencil icon on any group
- **Delete**: Click trash icon (only when unlocked)

## Testing the Auto-Cleanup

### Test 1: Normal Disconnect
1. Open visitor page in browser
2. Select a group (it locks)
3. Close the browser tab
4. Check admin panel - should see auto-cleanup log entry
5. Group should be unlocked

### Test 2: Manual Unlock
1. Lock a group
2. In admin panel, click "Unlock" button
3. All LEDs should turn off
4. Group status should change to "Available"

### Test 3: Unlock All
1. Lock multiple groups (use multiple browser tabs)
2. Click "Unlock All (X)" in admin panel
3. All groups should unlock simultaneously

## Monitoring

### Activity Log Shows:
- `🟢 Auto-cleanup monitor activated` - System ready
- `👤 User disconnected from "Group Name"` - Disconnect detected
- `✅ Auto-cleanup: "Group Name" unlocked, X LEDs off` - Success
- `🔓 Manually unlocking "Group Name"...` - Manual action
- `❌ Failed to...` - Errors (check console)

### Arduino Client Shows:
```
[MONITOR] Presence sync: 2 users online
[MONITOR] User left: user-abc123xyz
[MONITOR] User disconnected from group 1, initiating cleanup...
[MONITOR] Turning off 4 LEDs for group "Body Parts"
Sending command to Arduino: OFF:2
Sending command to Arduino: OFF:3
Sending command to Arduino: OFF:4
Sending command to Arduino: OFF:5
[MONITOR] ✅ Successfully cleaned up group "Body Parts" (4 LEDs turned off)
```

## Troubleshooting

### "Auto-cleanup not working"
- ✅ Ensure Arduino client is running (`node index.js`)
- ✅ Click "Auto-Cleanup: ON" in admin panel
- ✅ Check both browser console and Node.js console

### "LEDs not turning off"
- ✅ Check Arduino is connected to COM3
- ✅ Verify `node index.js` shows "Serial port open"
- ✅ Test manual unlock button

### "Groups not showing"
- ✅ Check Supabase connection
- ✅ Click "Refresh" button
- ✅ Check browser console for errors

### "Group stays locked"
- ✅ Use "Unlock All" button in admin panel
- ✅ Restart Arduino client
- ✅ Check database manually

## Exhibition Tips

1. **Keep Arduino Client Running**: This is the most reliable cleanup method
2. **Keep Admin Panel Open**: On a staff tablet for monitoring
3. **Test Before Exhibition**: Run all test scenarios
4. **Have Backup**: Keep the "Unlock All" button ready
5. **Monitor Logs**: Watch activity log for any issues

## Network Setup

### Single Computer
- Run Arduino client: `node index.js`
- Run web server: `npm run dev`
- Access: `http://localhost:3000`

### Multiple Devices (LAN)
- Find computer IP: `ipconfig` (look for IPv4)
- Access from other devices: `http://192.168.x.x:3000`
- Example: `http://192.168.1.100:3000`

## Emergency Procedures

### Everything Locked
1. Open admin panel: `/admin`
2. Click "Unlock All (X)"
3. Wait 5 seconds
4. Refresh page

### Arduino Not Responding
1. Unplug Arduino USB
2. Close `node index.js`
3. Plug in Arduino
4. Run `node index.js` again

### Database Issues
1. Check Supabase dashboard
2. Manually update `group_usage` table
3. Set all `busy = false`

## Success Indicators

✅ Arduino client shows: `[MONITOR] Presence monitoring enabled`
✅ Admin panel shows: Green alert "Auto-cleanup monitor is active"
✅ Activity log shows: `🟢 Auto-cleanup monitor activated`
✅ Test disconnect works: Group unlocks automatically

You're all set! 🎉
