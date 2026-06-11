from __future__ import annotations

import json
import mimetypes
import re
import uuid
import webbrowser
from email import policy
from email.parser import BytesParser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse


ROOT = Path(__file__).resolve().parent
UPLOAD_ROOT = ROOT / "image" / "uploads"
ASSET_INDEX_PATH = UPLOAD_ROOT / "assets-index.json"
PORT = 41783
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}


class LocalAppHandler(SimpleHTTPRequestHandler):
    server_version = "XibaoLocalServer/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        route = urlparse(self.path).path
        if route.startswith(("/image/", "/fonts/")):
            self.send_header("Cache-Control", "public, max-age=604800")
        else:
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        route = urlparse(self.path).path.strip("/")
        if route == "api/assets":
            self._send_json({"assets": write_asset_index()})
            return
        super().do_GET()

    def do_POST(self):
        route = urlparse(self.path).path.strip("/")
        if route == "api/assets/cleanup":
            self._cleanup_assets()
            return

        if route == "upload":
            try:
                files = self._handle_upload()
                write_asset_index()
            except ValueError as exc:
                self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
                return
            except Exception as exc:
                self._send_json({"error": f"Upload failed: {exc}"}, HTTPStatus.INTERNAL_SERVER_ERROR)
                return

            self._send_json({"files": files})
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")

    def do_DELETE(self):
        route = urlparse(self.path).path.strip("/")
        if route != "api/assets":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        query = parse_qs(urlparse(self.path).query)
        src = (query.get("src") or [""])[0]
        try:
            target = resolve_upload_src(src)
            target.unlink()
            assets = write_asset_index()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return
        except FileNotFoundError:
            self._send_json({"error": "Asset not found"}, HTTPStatus.NOT_FOUND)
            return

        self._send_json({"removed": src, "assets": assets})

    def _handle_upload(self):
        content_type = self.headers.get("Content-Type", "")
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        if "multipart/form-data" not in content_type:
            raise ValueError("Only multipart/form-data is supported")
        if content_length <= 0:
            raise ValueError("Empty upload")

        body = self.rfile.read(content_length)
        header = f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
        message = BytesParser(policy=policy.default).parsebytes(header + body)

        bucket = "assets"
        pending_files = []
        for part in message.iter_parts():
            disposition = part.get("Content-Disposition", "")
            if "form-data" not in disposition:
                continue

            params = dict(part.get_params(header="content-disposition")[1:])
            field_name = params.get("name")
            filename = params.get("filename")
            payload = part.get_payload(decode=True) or b""

            if field_name == "bucket" and not filename:
                bucket = sanitize_bucket(payload.decode("utf-8", errors="ignore"))
                continue

            if field_name != "files" or not filename or not payload:
                continue

            pending_files.append((filename, payload))

        if not pending_files:
            raise ValueError("No files uploaded")

        return [save_upload(filename, payload, bucket) for filename, payload in pending_files]

    def _cleanup_assets(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0") or "0")
            body = self.rfile.read(content_length) if content_length else b"{}"
            payload = json.loads(body.decode("utf-8") or "{}")
            keep = set(payload.get("keep") or [])
            removed = cleanup_uploads(keep)
            assets = write_asset_index()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return
        except Exception as exc:
            self._send_json({"error": f"Cleanup failed: {exc}"}, HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self._send_json({"removed": removed, "assets": assets})

    def _send_json(self, payload, status=HTTPStatus.OK):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def sanitize_bucket(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", value).strip("_").lower()
    return cleaned or "assets"


def sanitize_filename(filename: str) -> tuple[str, str]:
    original = Path(unquote(filename)).name
    suffix = Path(original).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        guessed = mimetypes.guess_extension(mimetypes.guess_type(original)[0] or "")
        suffix = guessed if guessed in ALLOWED_EXTENSIONS else ".png"

    stem = Path(original).stem
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", stem).strip("_") or "asset"
    return stem[:60], suffix


def save_upload(filename: str, payload: bytes, bucket: str) -> dict[str, str]:
    stem, suffix = sanitize_filename(filename)
    target_dir = UPLOAD_ROOT / sanitize_bucket(bucket)
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{stem}_{uuid.uuid4().hex[:10]}{suffix}"
    target.write_bytes(payload)
    return {
        "name": filename,
        "src": target.relative_to(ROOT).as_posix()
    }


def resolve_upload_src(src: str) -> Path:
    if not src:
        raise ValueError("Missing asset src")
    target = (ROOT / unquote(src)).resolve()
    upload_root = UPLOAD_ROOT.resolve()
    try:
        target.relative_to(upload_root)
    except ValueError as exc:
        raise ValueError("Asset path is outside upload directory") from exc
    if target.name == ASSET_INDEX_PATH.name:
        raise ValueError("Asset index cannot be removed")
    return target


def build_asset_index() -> list[dict[str, str | int | float]]:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    assets = []
    for file_path in sorted(UPLOAD_ROOT.rglob("*")):
        if not file_path.is_file() or file_path.name == ASSET_INDEX_PATH.name:
            continue
        if file_path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue
        stat = file_path.stat()
        src = file_path.relative_to(ROOT).as_posix()
        assets.append({
            "id": src,
            "name": file_path.name,
            "src": src,
            "thumbnailSrc": src,
            "size": stat.st_size,
            "mtime": stat.st_mtime
        })
    return assets


def write_asset_index() -> list[dict[str, str | int | float]]:
    assets = build_asset_index()
    ASSET_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    ASSET_INDEX_PATH.write_text(
        json.dumps({"assets": assets}, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    return assets


def cleanup_uploads(keep: set[str]) -> list[str]:
    removed = []
    keep_targets = set()
    for src in keep:
        try:
            keep_targets.add(resolve_upload_src(src).resolve())
        except ValueError:
            continue

    for file_path in sorted(UPLOAD_ROOT.rglob("*")):
        if not file_path.is_file() or file_path.name == ASSET_INDEX_PATH.name:
            continue
        if file_path.resolve() in keep_targets:
            continue
        src = file_path.relative_to(ROOT).as_posix()
        file_path.unlink()
        removed.append(src)

    for directory in sorted((p for p in UPLOAD_ROOT.rglob("*") if p.is_dir()), reverse=True):
        if not any(directory.iterdir()):
            directory.rmdir()

    return removed


def main():
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    write_asset_index()
    address = ("127.0.0.1", PORT)
    url = f"http://{address[0]}:{PORT}/"
    print(f"喜报生成器已启动: {url}")
    print("按 Ctrl+C 停止服务")
    webbrowser.open(url)
    with ThreadingHTTPServer(address, LocalAppHandler) as server:
        server.serve_forever()


if __name__ == "__main__":
    main()
