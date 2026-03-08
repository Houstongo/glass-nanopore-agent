from pathlib import Path
import unittest


ROOT = Path(r"D:\AntigravityProject")
SKETCH = ROOT / "firmware" / "esp8266_websocket_bridge" / "esp8266_websocket_bridge.ino"
README = ROOT / "firmware" / "esp8266_websocket_bridge" / "README.md"


class Esp8266BridgeFilesTest(unittest.TestCase):
    def test_esp8266_sketch_exists(self):
        self.assertTrue(SKETCH.exists(), f"缺少 ESP8266 草图文件: {SKETCH}")

    def test_esp8266_sketch_contains_required_bridge_parts(self):
        content = SKETCH.read_text(encoding="utf-8")
        required_snippets = [
            '#include <ESP8266WiFiMulti.h>',
            '#include <WebSocketsServer.h>',
            'wifiMulti.addAP("XuHou_Group_2.4G", "XH123456");',
            'Serial.begin(115200);',
            'WebSocketsServer webSocket = WebSocketsServer(81);',
            'webSocket.begin();',
            'webSocket.broadcastTXT(',
            "if (incoming == '\\n')",
        ]
        for snippet in required_snippets:
            self.assertIn(snippet, content, f"草图缺少关键片段: {snippet}")

    def test_esp8266_readme_exists(self):
        self.assertTrue(README.exists(), f"缺少 ESP8266 使用说明: {README}")

    def test_esp8266_readme_mentions_ws_and_serial(self):
        content = README.read_text(encoding="utf-8")
        self.assertIn("115200", content)
        self.assertIn("WebSocket", content)
        self.assertIn("81", content)
        self.assertIn("USART3", content)


if __name__ == "__main__":
    unittest.main()
