class SignalGenerator:
    def __init__(self):
        self.is_connected = False
        self.params = {"freq": 1000, "vpp": 2.5, "high": 1.25, "low": -1.25}

    def connect(self, port="COM4"):
        self.is_connected = True
        return True

    def set_parameters(self, freq, vpp=None, high=None, low=None):
        self.params["freq"] = freq
        if vpp is not None: self.params["vpp"] = vpp
        if high is not None: self.params["high"] = high
        if low is not None: self.params["low"] = low
        return {"status": "success", "params": self.params}

    def get_state(self):
        return self.params

_instance = None
def get_signal_generator():
    global _instance
    if _instance is None:
        _instance = SignalGenerator()
    return _instance
