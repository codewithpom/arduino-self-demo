# Arduino LED Control System

A full-stack interactive LED control system designed for educational exhibitions. The system allows multiple users to control LED groups through a web interface with automatic cleanup when users disconnect.

## 🎯 Overview

This project consists of three main components:
1. **Arduino Client** - Node.js application that communicates with Arduino hardware
2. **Web Application** - Next.js web interface for visitors and administrators
3. **Supabase Backend** - Real-time database and presence tracking

### Key Features

- 🎨 **Interactive LED Control** - Visual grid interface for controlling individual LEDs
- 👥 **Multi-User Support** - Multiple visitors can use different LED groups simultaneously
- 🔒 **Group Locking** - Prevent conflicts with automatic group reservation
- 🤖 **Auto-Cleanup** - Automatically turn off LEDs when users disconnect
- 👨‍💼 **Admin Panel** - Monitor and manage all groups in real-time
- 📝 **LED Metadata** - Add titles and descriptions to individual LEDs
- 🔊 **Text-to-Speech** - Audio feedback for LED interactions

## 📁 Project Structure

```
arduino-self-demo/
├── index.js                    # Main Arduino client with presence monitoring
├── package.json               # Root dependencies
├── README.md                  # This file
├── QUICK_START_GUIDE.md      # Quick setup for exhibitions
├── TROUBLESHOOTING.md        # Common issues and solutions
│
├── server/                    # Alternative Express.js server (optional)
│   └── index.js
│
└── client/
    └── my-app/               # Next.js web application
        ├── app/
        │   ├── page.tsx                 # Main visitor interface
        │   ├── admin/
        │   │   └── page.tsx            # Admin panel
        │   ├── presence-test/
        │   │   └── page.tsx            # Presence testing utility
        │   └── api/                    # API routes
        │       ├── led-command/        # Send LED commands
        │       ├── group-lock/         # Lock/unlock groups
        │       ├── group-usage/        # Track group status
        │       ├── group-cleanup/      # Cleanup groups
        │       ├── led-metadata/       # Manage LED info
        │       ├── diagnostic/         # System diagnostics
        │       └── tts/               # Text-to-speech
        │
        ├── components/
        │   ├── led-control-panel.tsx   # Main LED control UI
        │   ├── led-grid.tsx            # Visual LED grid
        │   ├── group-selector.tsx      # Group selection
        │   └── status-log.tsx          # Activity logging
        │
        ├── lib/
        │   ├── client.ts              # Supabase client utilities
        │   ├── server.ts              # Server-side utilities
        │   └── types.ts               # TypeScript definitions
        │
        └── ADMIN_PANEL_README.md      # Admin panel documentation
```

## 🚀 Quick Start

### Prerequisites

- **Hardware**
  - Arduino board (Uno, Mega, etc.)
  - 8 LEDs connected to pins: 2, 3, 4, 5, 6, 7, A0, A1
  - USB connection to computer

- **Software**
  - Node.js (v16 or higher)
  - npm or yarn
  - Arduino IDE (for uploading firmware)

### Installation

#### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd arduino-self-demo

# Install root dependencies
npm install

# Install Next.js app dependencies
cd client/my-app
npm install
```

#### 2. Configure Environment Variables

Create `.env.local` in `client/my-app/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lyoeyhpxgwniequxczrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### 3. Configure Arduino COM Port

Edit `index.js` (line 5):
```javascript
const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
```
Change `'COM3'` to match your Arduino's port (check Arduino IDE → Tools → Port)

#### 4. Upload Arduino Firmware

Upload the Arduino sketch that handles serial commands in format:
- `ON:<pin_number>`
- `OFF:<pin_number>`

### Running the Application

#### For Exhibitions (Recommended)

```bash
# Terminal 1: Start Arduino client
cd arduino-self-demo
node index.js

# Terminal 2: Start web application
cd client/my-app
npm run dev
```

Then open:
- **Visitor Interface**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

See [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) for detailed exhibition setup.

## 🎮 Usage

### For Visitors

1. Open the web interface at http://localhost:3000
2. Select a LED group from the dropdown
3. Click "Lock Group" to reserve the group
4. Click LEDs in the grid to turn them on/off
5. Click "Unlock Group" when finished

**Note**: If you close the browser without unlocking, the system automatically cleans up!

### For Administrators

1. Open http://localhost:3000/admin
2. Enable "Auto-Cleanup: ON" for automatic monitoring
3. View all groups and their current status
4. Manually unlock groups if needed
5. Create, edit, or delete LED groups
6. Monitor activity log for system events

See [ADMIN_PANEL_README.md](client/my-app/ADMIN_PANEL_README.md) for full admin documentation.

## 🏗️ Architecture

### System Flow

```
┌─────────────┐
│   Visitor   │
│  Browser    │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────────┐
│   Next.js App   │
│  (localhost:3000)│
└────────┬────────┘
         │ REST API
         ▼
┌──────────────────┐         ┌──────────────┐
│    Supabase      │◄────────┤  Admin Panel │
│   (Database +    │         └──────────────┘
│    Realtime)     │
└────────┬─────────┘
         │ Realtime Broadcast
         ▼
┌──────────────────┐
│  Arduino Client  │
│   (index.js)     │
└────────┬─────────┘
         │ Serial
         ▼
┌──────────────────┐
│  Arduino Board   │
│   (Hardware)     │
└──────────────────┘
```

### Auto-Cleanup System

The system uses **Supabase Presence** for tracking connected users:

1. **Visitor connects** → Joins presence channel with `groupId` and `userCode`
2. **Visitor disconnects** → Presence detects leave event
3. **Cleanup triggers** → Either Arduino client or Admin panel receives event
4. **LEDs turn off** → OFF commands sent for all LEDs in the group
5. **Group unlocks** → Database updated to make group available

This provides **dual redundancy**:
- Arduino client (`index.js`) always monitors and cleans up
- Admin panel (if open) also monitors and cleans up
- Either one can perform the cleanup independently

## 🗄️ Database Schema

### Supabase Tables

#### `grouping`
Stores LED group configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `title` | text | Group name (e.g., "Head and Neck") |
| `leds` | integer[] | Array of LED numbers (e.g., [1, 2, 3]) |

#### `group_usage`
Tracks real-time group lock status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Group ID (matches grouping.id) |
| `busy` | boolean | Is group currently locked? |
| `user` | text | Random code of user who locked it |

#### `led-text`
Stores metadata for individual LEDs.

| Column | Type | Description |
|--------|------|-------------|
| `led_number` | integer | LED number (1-8) |
| `title` | text | LED title |
| `description` | text | LED description |

### Realtime Channels

#### `led-commands`
Broadcasts LED control commands to Arduino clients.

**Event**: `led-command`
**Payload**: `{ command: string, groupId?: number }`

#### `led-group-presence`
Tracks user presence for auto-cleanup.

**Presence Tracking**: Users track their `groupId` and `userCode`

## 🔧 API Reference

See detailed API documentation in [client/my-app/app/api/](client/my-app/app/api/)

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/led-command` | POST | Send LED ON/OFF commands |
| `/api/group-lock` | POST | Lock/unlock groups |
| `/api/group-usage` | GET/POST | Check/update group status |
| `/api/group-cleanup` | POST | Turn off LEDs and unlock |
| `/api/led-metadata` | PUT/DELETE | Manage LED info |
| `/api/diagnostic` | GET | System health check |
| `/api/tts` | POST | Generate speech audio |

## 🎨 Components

### LED Control Panel
Main visitor interface with:
- Group selection dropdown
- Lock/Unlock controls
- Interactive LED grid
- Real-time status display

### LED Grid
Visual representation of LEDs:
- Click to toggle on/off
- Shows current state (lit/unlit)
- Displays LED metadata on hover
- Disabled when group is locked by another user

### Admin Panel
Management interface with:
- Group status monitoring (auto-refresh every 5s)
- Manual unlock controls
- Auto-cleanup toggle
- Activity log viewer
- CRUD operations for groups

## ⚡ Hardware Configuration

### LED Pin Mapping

| LED Number | Arduino Pin |
|------------|-------------|
| 1 | 2 |
| 2 | 3 |
| 3 | 4 |
| 4 | 5 |
| 5 | 6 |
| 6 | 7 |
| 7 | A0 |
| 8 | A1 |

### Serial Communication

- **Baud Rate**: 9600
- **Command Format**: `ACTION:PIN\n`
  - Example: `ON:2` (turn on pin 2)
  - Example: `OFF:A0` (turn off pin A0)

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed debugging steps.

### Common Issues

**Arduino not connecting:**
- Check COM port in `index.js`
- Verify Arduino is connected via USB
- Ensure no other programs are using the serial port

**Auto-cleanup not working:**
- Verify all components use channel `"led-group-presence"`
- Enable Supabase Realtime in dashboard
- Check Arduino client is running (`node index.js`)
- Enable Auto-Cleanup in admin panel

**LEDs not responding:**
- Check hardware connections
- Verify LED pin mapping in `LED_TO_PIN` object
- Test with Arduino Serial Monitor
- Check browser console for command errors

**Database errors:**
- Run diagnostic: http://localhost:3000/api/diagnostic
- Check Supabase credentials in `.env.local`
- Verify table permissions (RLS policies)

## 🧪 Testing

### Presence System Test
```bash
# Open in browser
http://localhost:3000/presence-test
```
- Click "Run Diagnostic Test"
- Open page in multiple tabs
- Watch user count increase/decrease
- Verify presence events in console

### Auto-Cleanup Test
1. Lock a group in visitor interface
2. Close browser tab (don't unlock)
3. Check Arduino client console for cleanup logs
4. Check admin panel activity log
5. Verify group is unlocked in database

### API Health Check
```bash
# Run system diagnostic
curl http://localhost:3000/api/diagnostic
```

## 📦 Dependencies

### Root (Arduino Client)
- `@supabase/supabase-js` - Realtime communication
- `serialport` - Arduino serial communication

### Next.js App
- `next` - React framework
- `@supabase/supabase-js` - Database & realtime
- `@radix-ui/*` - UI components
- `lucide-react` - Icons
- `tailwindcss` - Styling
- `gtts` - Text-to-speech generation

## 🔐 Security Notes

- Service role key is only used server-side (API routes)
- Anon key is used in browser but protected by RLS
- Group locking prevents race conditions
- Presence tracking identifies users by random codes

## 📚 Additional Documentation

- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - Quick setup for exhibitions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
- [ADMIN_PANEL_README.md](client/my-app/ADMIN_PANEL_README.md) - Admin features
- [API Documentation](client/my-app/app/api/) - Endpoint details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

ISC License

## 👥 Use Cases

### Educational Exhibitions
- Interactive museum displays
- Science fair demonstrations
- Classroom interactive projects
- STEM learning activities

### Event Displays
- Trade show booths
- Interactive installations
- Public demonstrations
- Visitor engagement systems

## 🔄 Future Enhancements

- [ ] Mobile app for iOS/Android
- [ ] Multiple Arduino board support
- [ ] LED pattern programming interface
- [ ] User analytics and usage statistics
- [ ] WebSocket alternative to Supabase
- [ ] Offline mode with local database
- [ ] Custom LED animations
- [ ] Voice control integration

## 📞 Support

For issues, questions, or contributions:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Open an issue on GitHub
3. Review existing documentation

---

**Built with** ❤️ **for interactive learning experiences**
