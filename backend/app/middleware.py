"""Bound multipart body size before Starlette parses/spools uploaded files."""

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
from .services.uploads import MAX_TOTAL


class UploadBodyLimit:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        is_upload = (
            scope["type"] == "http"
            and scope["method"] == "POST"
            and scope["path"].startswith("/api/projects/")
            and scope["path"].endswith("/files")
        )
        if not is_upload:
            await self.app(scope, receive, send)
            return
        # Allow bounded multipart headers in addition to the source-byte quota.
        limit = MAX_TOTAL + 512 * 1024
        headers = dict(scope["headers"])
        try:
            declared = int(headers.get(b"content-length", b"0"))
        except ValueError:
            await JSONResponse({"detail": "Invalid content length"}, status_code=400)(scope, receive, send)
            return
        if declared > limit:
            await JSONResponse({"detail": "Upload body exceeds the request limit"}, status_code=413)(
                scope, receive, send
            )
            return
        buffer = bytearray()
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            data = message.get("body", b"")
            total += len(data)
            if total > limit:
                await JSONResponse({"detail": "Upload body exceeds the request limit"}, status_code=413)(
                    scope, receive, send
                )
                return
            buffer.extend(data)
            if not message.get("more_body", False):
                break
        body = bytes(buffer)
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, bounded_receive, send)
