import os
import subprocess


def test_import_layering():
    # Run the import-linter to ensure domain does not import infra/application
    # The linter is configured in .importlinter
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    result = subprocess.run(["lint-imports"], cwd=backend_dir, capture_output=True, text=True, env=env)
    assert result.returncode == 0, f"Import layering violated:\n{result.stdout}\n{result.stderr}"
