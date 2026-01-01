const { createClient } = require('@supabase/supabase-js');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fetch = require('node-fetch'); // For making HTTP requests

const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on("open", () => {
    console.log('Serial port open');
});

parser.on('data', data => {
    console.log('Got word from Arduino:', data);
});

const supabaseUrl = "https://lyoeyhpxgwniequxczrs.supabase.co";
const supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5b2V5aHB4Z3duaWVxdXhjenJzIiwicm9sZSI6ImF
24iLCJpYXQiOjE3NjQ5MjkxNTgsImV4cCI6MjA4MDUwNTE1OH0.8VOnpeT1Fd877VIoxINxFCrSLVWpxY - WTPLX8BgEcNo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_BASE_URL = 'http://localhost:3000';

const LED_TO_PIN = {
    "1": "2", "2": "3", "3": "4", "4": "5",
    "5": "6", "6": "7", "7": "A0", "8": "A1",
};

function sendArduinoCommand(command) {
    console.log('Sending command to Arduino:', command);
    port.write(`${command}\n`, (err) => {
        if (err) {
            return console.log('Error on write: ', err.message);
        }
        console.log('Message written to Arduino');
    });
}

async function turnOffGroupLeds(groupId) {
    const { data: groupData, error } = await supabase
        .from('grouping')
        .select('leds')
        .eq('id', groupId)
        .single();

    if (error) {
        console.error(`Error fetching group ${groupId} for LED turn off:`, error);
        return;
    }

    if (groupData && groupData.leds) {
        console.log(`Turning off LEDs for group ${groupId}:`, groupData.leds);
        for (const led of groupData.leds) {
            const pin = LED_TO_PIN[led.toString()];
            if (pin) {
                sendArduinoCommand(`OFF:${pin}`);
            }
        }
    }
}

// Listen for direct commands to turn LEDs on/off
const ledCommandsChannel = supabase.channel('led-commands');

ledCommandsChannel.on('broadcast', { event: 'led-command' }, async ({ payload }) => {
    console.log('Received broadcast:', payload);
    const { command, groupId } = payload;

    if (command === 'OFF:GROUP') {
        await turnOffGroupLeds(groupId);
    } else {
        const [action, ledNumber] = command.split(':');
        const pin = LED_TO_PIN[ledNumber];
        if (!pin) {
            console.log('Invalid LED number:', ledNumber);
            return;
        }
        sendArduinoCommand(`${action}:${pin}`);
    }
});

ledCommandsChannel.subscribe();

// Function to unlock a group via API
async function unlockGroup(groupId) {
    try {
        console.log(`Unlocking group ${groupId} due to client disconnect...`);
        const response = await fetch(`${API_BASE_URL}/api/group-lock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId, action: 'unlock' }),
        });
        if (!response.ok) {
            console.error(`Failed to unlock group ${groupId}:`, await response.text());
        } else {
            console.log(`Group ${groupId} unlocked successfully.`);
        }
    } catch (error) {
        console.error(`Error unlocking group ${groupId}:`, error);
    }
}

// Set up presence channels for each group to detect disconnections
async function setupPresenceChannels() {
    const { data: groups, error } = await supabase.from('grouping').select('id');
    if (error) {
        console.error('Error fetching groups:', error);
        return;
    }

    for (const group of groups) {
        const groupId = group.id;
        const channel = supabase.channel(`group-presence-${groupId}`);

        channel.on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const userCount = Object.keys(presenceState).length;
            console.log(`Presence sync for group ${groupId}: ${userCount} user(s) online.`);

            if (userCount === 0) {
                // Last user left, ensure the group is unlocked
                unlockGroup(groupId);
            }
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`Subscribed to presence channel for group ${groupId}`);
            }
        });
    }
}

console.log("Starting laptop client...");
setupPresenceChannels();
