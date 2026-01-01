const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// Load environment variables
require('dotenv').config();

// Import custom modules
const arduino = require('./services/arduino-connector');
const speech = require('./services/speech-service');
const tunnel = require('./services/tunnel-service');
const accessRoutes = require('./routes/access');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- State Management for Group Locks ---
// Tracks which group is locked by which socket. e.g., { 'A': 'socketId123' }
const groupLocks = {
    A: null,
    B: null,
    C: null,
};

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/access', accessRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('<h1>Smart Chart Paper System Backend</h1>');
});

// --- Real-time Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send initial state to the newly connected client
  socket.emit('state_update', arduino.getLedState());
  socket.emit('locks_update', groupLocks); // Send current lock status

  // --- Group Lock and Control Logic ---

  socket.on('lock_group', (group) => {
    if (groupLocks[group] === socket.id) return; // Already locked by this user

    if (groupLocks[group]) {
      // Group is locked by someone else
      socket.emit('lock_failed', { group, message: 'Group is currently locked by another user.' });
      return;
    }
    
    // Lock the group to the current user
    console.log(`Locking group ${group} for ${socket.id}`);
    groupLocks[group] = socket.id;

    // Activate LEDs and speech
    arduino.activateGroup(group);
    speech.speakForGroup(group);

    // Notify all clients about the state and lock changes
    io.emit('state_update', arduino.getLedState());
    io.emit('locks_update', groupLocks);
  });

  socket.on('unlock_group', (group) => {
    if (groupLocks[group] === socket.id) {
      console.log(`Unlocking group ${group} for ${socket.id}`);
      // Release the lock
      groupLocks[group] = null;
      
      // Turn off all LEDs
      arduino.sendCommand('RESET');

      // Notify all clients
      io.emit('state_update', arduino.getLedState());
      io.emit('locks_update', groupLocks);
    }
  });


  // --- Disconnect "Presence" Logic ---

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    let unlockedGroup = null;

    // Check if the disconnecting user was locking a group
    for (const group in groupLocks) {
      if (groupLocks[group] === socket.id) {
        console.log(`User ${socket.id} disconnected, unlocking group ${group}.`);
        groupLocks[group] = null; // Release the lock
        unlockedGroup = group;
        break;
      }
    }

    if (unlockedGroup) {
      // Turn off all LEDs since the controlling user left
      arduino.sendCommand('RESET');
      
      // Notify remaining clients about the state and lock changes
      io.emit('state_update', arduino.getLedState());
      io.emit('locks_update', groupLocks);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Connect to Arduino and start tunnel when the server starts
  arduino.connectToArduino();
  tunnel.init(io, PORT);
});

// Export the io instance for use in other modules
module.exports = { io };
