// Arduino code: Controls any pin using commands like "ON:3" or "OFF:A0"
// All digital + analog pins are set as OUTPUT.

void setup()
{
    Serial.begin(9600);

    // Set all digital pins as OUTPUT
    for (int i = 0; i <= 13; i++)
    {
        pinMode(i, OUTPUT);
    }

    // On Uno, analog pins A0–A5 map to 14–19
    for (int i = A0; i <= A5; i++)
    {
        pinMode(i, OUTPUT);
    }

    Serial.println("Ready. Use ON:pin or OFF:pin");
}

void loop()
{
    if (Serial.available())
    {
        String cmd = Serial.readStringUntil('\n');
        cmd.trim();

        int colonIndex = cmd.indexOf(':');
        if (colonIndex == -1)
            return;

        String action = cmd.substring(0, colonIndex);
        String pinStr = cmd.substring(colonIndex + 1);

        int pin;

        // Check if analog pin (starts with 'A')
        if (pinStr.startsWith("A") || pinStr.startsWith("a"))
        {
            pin = A0 + pinStr.substring(1).toInt();
        }
        else
        {
            pin = pinStr.toInt();
        }

        // Execute ON/OFF
        if (action.equalsIgnoreCase("ON"))
        {
            digitalWrite(pin, HIGH);
            Serial.print("Pin ");
            Serial.print(pinStr);
            Serial.println(" -> ON");
        }
        else if (action.equalsIgnoreCase("OFF"))
        {
            digitalWrite(pin, LOW);
            Serial.print("Pin ");
            Serial.print(pinStr);
            Serial.println(" -> OFF");
        }
    }
}