"""Package tracked source only; never include local credentials/dependencies."""

import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
files = (
    subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
)
output = root / "CodeAtlas-submission.zip"
with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
    for relative in sorted(filter(None, files)):
        path = root / relative
        if path.is_file():
            archive.write(path, "CodeAtlas/" + relative)
with zipfile.ZipFile(output) as archive:
    names = archive.namelist()
    assert not any("/.env" in n and not n.endswith(".env.example") for n in names)
    assert archive.testzip() is None
print(
    f"Packaged {len(names)} files into {output.name} ({output.stat().st_size // 1024} KB)."
)
