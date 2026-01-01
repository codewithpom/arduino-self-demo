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
├── arduino-client.js          # Main Arduino client with presence monitoring
├── arduino-code.ino           # Arduino firmware for LED control
├── laptop-client-arduino.js   # Alternative Arduino client
├── package.json               # Project dependencies
├── README.md                  # This file
├── QUICK_START_GUIDE.md      # Quick setup for exhibitions
├── TROUBLESHOOTING.md        # Common issues and solutions
├── ADMIN_PANEL_README.md     # Admin panel documentation
│
├── app/                       # Next.js application
│   ├── page.tsx              # Main visitor interface
│   ├── admin/
│   │   └── page.tsx          # Admin panel
│   ├── presence-test/
│   │   └── page.tsx          # Presence testing utility
│   └── api/                  # API routes
│       ├── led-command/      # Send LED commands
│       ├── group-lock/       # Lock/unlock groups
│       ├── group-usage/      # Track group status
│       ├── group-cleanup/    # Cleanup groups
│       ├── led-metadata/     # Manage LED info
│       ├── diagnostic/       # System diagnostics
│       └── tts/             # Text-to-speech
│
├── components/               # React components
│   ├── led-control-panel.tsx
│   ├── led-grid.tsx
│   ├── group-selector.tsx
│   ├── status-log.tsx
│   └── ui/                  # shadcn/ui components
│
├── lib/                     # Utility libraries
│   ├── client.ts            # Client-side utilities
│   ├── server.ts            # Server-side utilities
│   ├── cookies.ts           # Cookie management
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # General utilities
│
├── scripts/                 # Database migration scripts
│   └── *.sql
│
└── server/                  # Alternative Express.js server (optional)
    └── index.js
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Arduino board with LED setup
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/codewithpom/arduino-self-demo.git
cd arduino-self-demo
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (create `.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Upload Arduino code:
- Open `arduino-code.ino` in Arduino IDE
- Upload to your Arduino board

5. Run the development server:
```bash
# Start the Next.js web application
npm run dev

# In another terminal, start the Arduino client
npm run arduino
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Documentation

- [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - Fast setup guide for exhibitions
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solutions to common problems
- [ADMIN_PANEL_README.md](ADMIN_PANEL_README.md) - Admin panel features and usage

## 🛠️ Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run arduino` - Start Arduino client (connects to hardware)
- `npm run server` - Start alternative Express.js server (optional)
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Arduino Connection
Edit `arduino-client.js` to configure your serial port:
```javascript
const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
```

### LED Pin Mapping
Update the LED-to-pin mapping in both files:
- `arduino-client.js` - Node.js mapping
- `arduino-code.ino` - Arduino firmware mapping

## 📦 Dependencies

### Main Dependencies
- Next.js 16 - React framework
- React 19 - UI library
- Supabase - Backend and real-time database
- SerialPort - Arduino communication
- Radix UI - Component primitives
- Tailwind CSS - Styling

### Development Dependencies
- TypeScript - Type safety
- ESLint - Code linting

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC

## 🙏 Acknowledgments

Built for educational exhibitions to create interactive learning experiences.
