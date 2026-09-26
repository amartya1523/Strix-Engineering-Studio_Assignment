import io
import stat
import zipfile
from pathlib import PurePosixPath
from fastapi import HTTPException

MAX_FILE = 512 * 1024
MAX_TOTAL = 10 * 1024 * 1024
MAX_FILES = 300
LANGUAGES = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "jsx",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".json": "json",
    ".html": "markup",
    ".css": "css",
    ".scss": "css",
    ".sql": "sql",
    ".md": "markdown",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".sh": "bash",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".txt": "text",
    ".toml": "toml",
    ".xml": "markup",
    ".rb": "ruby",
    ".php": "php",
    ".vue": "markup",
    ".svelte": "markup",
    ".prisma": "text",
    ".ini": "text",
    ".cfg": "text",
}
IGNORED = {"node_modules", ".git", ".next", "__pycache__", ".venv", "venv", "dist", "build", "__MACOSX"}


def safe_path(name: str) -> str:
    name = name.replace("\\", "/")
    path = PurePosixPath(name)
    if (
        path.is_absolute()
        or ".." in path.parts
        or not path.parts
        or ":" in name
        or "\x00" in name
        or len(name) > 512
        or any(ord(c) < 32 for c in name)
    ):
        raise HTTPException(400, "Invalid file path")
    return str(path)


def decode_file(path, data):
    parts = PurePosixPath(path).parts
    name = parts[-1]
    if any(part in IGNORED for part in parts) or name.startswith(".env") or name == ".DS_Store":
        return None
    suffix = PurePosixPath(path).suffix.lower()
    if suffix not in LANGUAGES and name not in {"Dockerfile", "Makefile", ".gitignore"}:
        return None
    if len(data) > MAX_FILE:
        raise HTTPException(413, f"{path} exceeds the 512 KB file limit")
    try:
        content = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return None
    if "\x00" in content:
        return None
    return {"path": path, "content": content, "size": len(data), "language": LANGUAGES.get(suffix, "text")}


def parse_upload(name: str, data: bytes):
    if len(data) > MAX_TOTAL:
        raise HTTPException(413, "Upload exceeds the 10 MB limit")
    if name.lower().endswith(".zip"):
        results = []
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if len(entries) > MAX_FILES * 3:
                    raise HTTPException(413, "Archive has too many entries")
                total = 0
                for entry in entries:
                    path = safe_path(entry.filename)
                    if entry.is_dir():
                        continue
                    if stat.S_ISLNK(entry.external_attr >> 16):
                        raise HTTPException(400, "Symbolic links are not accepted")
                    total += entry.file_size
                    if entry.file_size > MAX_FILE or total > MAX_TOTAL:
                        raise HTTPException(413, "Archive exceeds the decompressed size limit")
                    item = decode_file(path, archive.read(entry))
                    if item:
                        results.append(item)
        except (zipfile.BadZipFile, RuntimeError, NotImplementedError):
            raise HTTPException(400, "Invalid or encrypted ZIP archive") from None
        return results
    item = decode_file(safe_path(name), data)
    return [item] if item else []
