import threading
from database import get_settings

class MockSensor:
    def __init__(self,on_reading):
        self.on_reading=on_reading; self.stop_event=threading.Event(); self.manual=None; self.values=[920,650,250]; self.idx=0
    def start(self):
        threading.Thread(target=self.run,daemon=True).start()
    def set_manual(self,value): self.manual=value
    def run(self):
        while not self.stop_event.is_set():
            value=self.manual
            if value is None:
                value=self.values[self.idx]; self.idx=(self.idx+1)%len(self.values)
            self.on_reading(int(value),'mock')
            self.stop_event.wait(max(1,int(get_settings()['read_interval'])))
