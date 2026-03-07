import subprocess
import unittest
from pathlib import Path


class DevCheckScriptsTests(unittest.TestCase):
    def test_dev_check_script_exists(self) -> None:
        script_path = Path(r"D:\AntigravityProject\scripts\dev\check-dev-env.ps1")
        self.assertTrue(script_path.exists())

    def test_dev_check_script_reports_expected_paths(self) -> None:
        script_path = Path(r"D:\AntigravityProject\scripts\dev\check-dev-env.ps1")
        completed = subprocess.run(
            [
                "powershell",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        output = completed.stdout
        self.assertIn("apps\\glass_nanopore_agent", output)
        self.assertIn("data\\etching_experiments.sqlite", output)
        self.assertIn("D:\\LabOSData\\cvdata", output)
        self.assertIn("firmware\\etching_controller\\untitle4.ioc", output)

    def test_dev_check_script_reports_npm_available(self) -> None:
        script_path = Path(r"D:\AntigravityProject\scripts\dev\check-dev-env.ps1")
        completed = subprocess.run(
            [
                "powershell",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script_path),
            ],
            capture_output=True,
            text=True,
            check=True,
        )

        self.assertIn("- npm: OK", completed.stdout)

    def test_run_frontend_script_contains_npm_fallback(self) -> None:
        script_path = Path(r"D:\AntigravityProject\scripts\dev\run-frontend.ps1")
        content = script_path.read_text(encoding="utf-8")

        self.assertIn(r"D:\nodejs\npm.cmd", content)
        self.assertIn("ESBUILD_BINARY_PATH", content)
        self.assertIn("D:\\nodejs;", content)

    def test_run_scripts_do_not_use_reserved_host_parameter_name(self) -> None:
        for script in (
            Path(r"D:\AntigravityProject\scripts\dev\run-agent.ps1"),
            Path(r"D:\AntigravityProject\scripts\dev\run-frontend.ps1"),
        ):
            content = script.read_text(encoding="utf-8")
            self.assertNotIn("[string]$Host", content)


if __name__ == "__main__":
    unittest.main()
