import time
import threading
import json

class HardwareBridge:
    def __init__(self):
        self.is_connected = False
        self.mode = "Serial"
        self.port = "None"
        self.state = {
            "sys_state": 0,
            "adc_val": 0,
            "pulse_cnt": 0,
            "bridge_internal_state": "DISCONNECTED",
            "raw_log": []
        }
        self.lock = threading.Lock()

    def connect(self, mode="Serial", port_or_ip="COM3"):
        self.mode = mode
        self.port = port_or_ip
        self.is_connected = True
        self.state["bridge_internal_state"] = "CONNECTED"
        return True

    def disconnect(self):
        self.is_connected = False
        self.state["bridge_internal_state"] = "DISCONNECTED"

    def get_state(self):
        with self.lock:
            # 模拟一些噪声和数据变化
            import random
            if self.is_connected:
                self.state["adc_val"] = random.randint(1500, 1600)
                if self.state["sys_state"] == 1: # Etching
                    self.state["pulse_cnt"] += random.randint(5, 20)
            return self.state

    def send_command(self, flag):
        if flag == 16: # Start
            self.state["sys_state"] = 1
        elif flag == 7: # Stop / Emergency
            self.state["sys_state"] = 0
        return True, "OK"

    def trigger_auto_etch(self, depth_um, time_s, counts):
        self.state["sys_state"] = 1
        # 简单模拟：几秒后停止
        def auto_stop():
            time.sleep(time_s)
            self.state["sys_state"] = 0
        threading.Thread(target=auto_stop).start()
        return True, "Auto etching started"

    def get_telemetry(self):
        return self.get_state()

_instance = None
def get_bridge():
    global _instance
    if _instance is None:
        _instance = HardwareBridge()
    return _instance
