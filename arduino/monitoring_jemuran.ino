const int rainPin = A0;
const int greenLed = 5;
const int yellowLed = 6;
const int redLed = 7;
const int buzzer = 11;

// Nilai default. Nanti bisa berubah dari halaman admin.
int thresholdHujan = 400;
int thresholdGerimis = 800;
bool buzzerEnabled = true;
unsigned long readInterval = 2000;

unsigned long lastRead = 0;

void setup() {
  Serial.begin(9600);

  pinMode(greenLed, OUTPUT);
  pinMode(yellowLed, OUTPUT);
  pinMode(redLed, OUTPUT);
  pinMode(buzzer, OUTPUT);

  Serial.println("Arduino monitoring jemuran siap");
}

void loop() {
  bacaKonfigurasiDariBackend();

  unsigned long now = millis();

  if (now - lastRead >= readInterval) {
    lastRead = now;

    int sensor = analogRead(rainPin);
    String status;

    digitalWrite(greenLed, LOW);
    digitalWrite(yellowLed, LOW);
    digitalWrite(redLed, LOW);
    digitalWrite(buzzer, LOW);

    if (sensor < thresholdHujan) {
      status = "HUJAN";
      digitalWrite(redLed, HIGH);

      if (buzzerEnabled) {
        digitalWrite(buzzer, HIGH);
      }
    }
    else if (sensor <= thresholdGerimis) {
      status = "GERIMIS";
      digitalWrite(yellowLed, HIGH);
    }
    else {
      status = "CERAH";
      digitalWrite(greenLed, HIGH);
    }

    Serial.print("{\"sensor\":");
    Serial.print(sensor);
    Serial.print(",\"status\":\"");
    Serial.print(status);
    Serial.println("\"}");
  }
}

void bacaKonfigurasiDariBackend() {
  if (!Serial.available()) {
    return;
  }

  String command = Serial.readStringUntil('\n');
  command.trim();

  if (!command.startsWith("CFG,")) {
    return;
  }

  int rainThresholdBaru;
  int dryThresholdBaru;
  int buzzerAktif;
  unsigned long intervalBaru;

  int parsed = sscanf(
    command.c_str(),
    "CFG,%d,%d,%d,%lu",
    &rainThresholdBaru,
    &dryThresholdBaru,
    &buzzerAktif,
    &intervalBaru
  );

  if (parsed == 4) {
    thresholdHujan = rainThresholdBaru;
    thresholdGerimis = dryThresholdBaru;
    buzzerEnabled = buzzerAktif == 1;
    readInterval = intervalBaru;

    Serial.println("CFG_OK");
  }
}