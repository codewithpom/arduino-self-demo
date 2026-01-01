const { createClient } = require('@supabase/supabase-js');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const port = new SerialPort({ path: 'COM3', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.on("open", () => {
    console.log('Serial port open');
});

parser.on('data', data => {
    console.log('Got word from Arduino:', data);
});

const supabaseUrl = "https://lyoeyhpxgwniequxczrs.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5b2V5aHB4Z3duaWVxdXhjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MjkxNTgsImV4cCI6MjA4MDUwNTE1OH0.8VOnpeT1Fd877VIoxINxFCrSLVWpxY-WTPLX8BgEcNo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);



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
// command format from supabase:
// OFF:{{LED_NUMBER}}
// ON:{{LED_NUMBER}}

// command format to arduino:
// OFF:{{PIN_NUMBER}}
// ON:{{PIN_NUMBER}}
// Listen for direct commands to turn LEDs on/off
const ledCommandsChannel = supabase.channel('led-commands');

ledCommandsChannel.on('broadcast', { event: 'led-command' }, async ({ payload }) => {
    console.log('Received broadcast:', payload);
    const { command, groupId } = payload;
    // Map LED number to pin number
    const [action, ledNumber] = command.split(':');
    const pinNumber = LED_TO_PIN[ledNumber];
    if (pinNumber) {
        const arduinoCommand = `${action}:${pinNumber}`;
        sendArduinoCommand(arduinoCommand);
    } else {

        console.error('Unknown LED number:', ledNumber);
    }


});

ledCommandsChannel.subscribe();

// Setup presence monitoring for auto-cleanup
let monitoringActive = true;
const presenceChannel = supabase.channel('led-group-presence');

presenceChannel
    .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        console.log('[ARDUINO-MONITOR] Presence sync:', Object.keys(state).length, 'users online');
    })
    .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[ARDUINO-MONITOR] User joined:', key);
    })
    .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
        if (!monitoringActive) return;

        console.log('[ARDUINO-MONITOR] User left:', key);
        console.log('[ARDUINO-MONITOR] Left presences:', leftPresences);

        for (const presence of leftPresences) {
            const { groupId, userCode } = presence;

            if (groupId) {
                console.log(`[ARDUINO-MONITOR] User disconnected from group ${groupId}, initiating cleanup...`);

                try {
                    // Fetch group details to turn off LEDs
                    const { data: group, error: groupError } = await supabase
                        .from('grouping')
                        .select('leds, title')
                        .eq('id', groupId)
                        .single();

                    if (groupError) {
                        console.error('[ARDUINO-MONITOR] Failed to fetch group:', groupError);
                        continue;
                    }

                    // Turn off all LEDs in the group
                    console.log(`[ARDUINO-MONITOR] Turning off ${group.leds.length} LEDs for group "${group.title}"`);
                    for (const ledNum of group.leds) {
                        const pinNumber = LED_TO_PIN[ledNum.toString()];
                        if (pinNumber) {
                            const arduinoCommand = `OFF:${pinNumber}`;
                            sendArduinoCommand(arduinoCommand);
                            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between commands
                        }
                    }

                    // Unlock the group in database
                    const { error: unlockError } = await supabase
                        .from('group_usage')
                        .update({ busy: false, user: null })
                        .eq('id', groupId);

                    if (unlockError) {
                        console.error('[ARDUINO-MONITOR] Failed to unlock group:', unlockError);
                    } else {
                        console.log(`[ARDUINO-MONITOR] ✅ Successfully cleaned up group "${group.title}" (${group.leds.length} LEDs turned off)`);
                    }
                } catch (error) {
                    console.error('[ARDUINO-MONITOR] Cleanup error:', error);
                }
            }
        }
    })
    .subscribe((status) => {
        console.log('[ARDUINO-MONITOR] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
            console.log('[ARDUINO-MONITOR] ✅ Successfully subscribed to presence channel');
        }
    });

console.log("Starting laptop client...");
console.log("[MONITOR] Presence monitoring enabled - will auto-cleanup on user disconnect");

