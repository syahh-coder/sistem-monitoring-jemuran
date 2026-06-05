const int rainPin = A0;
const int greenLed = 5;
const int yellowLed = 6;
const int redLed = 7;
const int buzzer = 11;

const int thresholdHujan = 400;
const int thresholdGerimis = 800;

void setup() {
  Serial.begin(9600);

  pinMode(greenLed, OUTPUT);
  pinMode(yellowLed, OUTPUT);
  pinMode(redLed, OUTPUT);
  pinMode(buzzer, OUTPUT);
}

void loop() {
  int sensor = analogRead(rainPin);
  String status;

  digitalWrite(greenLed, LOW);
  digitalWrite(yellowLed, LOW);
  digitalWrite(redLed, LOW);
  digitalWrite(buzzer, LOW);

  if (sensor < thresholdHujan) {
    status = "HUJAN";
    digitalWrite(redLed, HIGH);
    digitalWrite(buzzer, HIGH);
  } else if (sensor <= thresholdGerimis) {
    status = "GERIMIS";
    digitalWrite(yellowLed, HIGH);
  } else {
    status = "CERAH";
    digitalWrite(greenLed, HIGH);
  }

  Serial.print("{\"sensor\":");
  Serial.print(sensor);
  Serial.print(",\"status\":\"");
  Serial.print(status);
  Serial.println("\"}");

  delay(2000);
}