# Admin Panel - LED Group Management

## Features

### 🎛️ **Group Management**
- **Create** new LED groups with custom names and LED assignments
- **Edit** existing groups (change titles or LED configurations)
- **Delete** groups (only when not in use)
- View real-time group status (Available/Locked)

### 🔓 **Manual Controls**
- **Unlock Individual Groups** - Turn off all LEDs and unlock specific groups
- **Unlock All Groups** - Emergency unlock for all locked groups simultaneously
- **Auto-Refresh** - Group status updates every 5 seconds

### 🤖 **Auto-Cleanup Monitoring**
- **Toggle Auto-Cleanup** - Enable/disable automatic cleanup on user disconnect
- **Presence Detection** - Uses Supabase presence channels to detect disconnections
- **Automatic LED Shutdown** - Turns off all LEDs when user disconnects
- **Automatic Unlock** - Frees up groups for other users
- **Dual Monitoring** - Works in both web admin panel and Arduino client (index.js)

### 📊 **Activity Log**
- Real-time activity logging
- Shows manual unlocks, auto-cleanups, and system events
- Timestamped entries for debugging
- Keeps last 20 entries

## Access

Navigate to: `/admin`

## How It Works

### Web Admin Panel
1. Open the admin page at `/admin`
2. Toggle "Auto-Cleanup: ON" to enable monitoring
3. The admin panel listens for presence leave events
4. When a user disconnects abruptly:
   - Detects the disconnect via Supabase presence
   - Calls the cleanup API
   - Turns off all LEDs in the locked group
   - Unlocks the group in the database

### Arduino Client (index.js)
1. The Arduino client now includes presence monitoring
2. Runs automatically when `node index.js` starts
3. Monitors for user disconnections
4. Directly controls Arduino to turn off LEDs
5. Updates database to unlock groups
6. Provides redundancy if no web clients are active

## Usage Scenarios

### School Exhibition Setup
1. **Start Arduino Client**: Run `node index.js` on a computer connected to Arduino
2. **Open Admin Panel**: Keep `/admin` open on a staff device or tablet
3. **Enable Auto-Cleanup**: Click the "Auto-Cleanup: ON" button
4. **Monitor**: Watch the activity log for real-time updates
5. **Manual Override**: Use manual unlock buttons if needed

### Manual Group Management
1. **Create Group**: Click "Create Group" and enter:
   - Group Title (e.g., "Body Parts")
   - LED Numbers (e.g., "1, 2, 3, 4")
2. **Edit Group**: Click the edit icon (pencil) on any group
3. **Delete Group**: Click the trash icon (only available when group is unlocked)

## Technical Details

### Auto-Cleanup Flow
```
User Disconnects
    ↓
Supabase Presence Detects Leave Event
    ↓
Admin Panel OR Arduino Client Receives Event
    ↓
Fetch Group Details (LEDs list)
    ↓
Send OFF commands for all LEDs
    ↓
Update database (busy = false, user = null)
    ↓
Log activity
```

### API Endpoints Used
- `POST /api/group-cleanup` - Turns off LEDs and unlocks group
- `GET /api/group-lock` - Manages group locking
- Direct Supabase queries for CRUD operations

## Troubleshooting

### Auto-Cleanup Not Working
- Ensure "Auto-Cleanup: ON" is enabled
- Check that Arduino client (`node index.js`) is running
- Verify Supabase realtime is enabled
- Check browser console for errors

### Groups Not Updating
- Click the "Refresh" button
- Check database connection
- Verify Supabase credentials

### LEDs Not Turning Off
- Ensure Arduino is connected (COM3)
- Check `index.js` is running
- Verify LED-to-Pin mapping in `index.js`

## Benefits for Exhibition

✅ **Automatic Recovery** - No manual intervention needed when visitors leave
✅ **Dual Redundancy** - Both web and Arduino client can trigger cleanup
✅ **Real-time Monitoring** - See all activity in one place
✅ **Easy Management** - Create/edit groups on the fly
✅ **Emergency Controls** - Quick unlock all groups if needed
