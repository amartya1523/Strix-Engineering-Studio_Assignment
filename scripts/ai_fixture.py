"""Deterministic OpenAI-compatible endpoint ONLY for automated tests.

Not a real AI model; never registered by the application automatically.
"""

import json
import re

from fastapi import FastAPI, Request

app = FastAPI(title="CodeAtlas E2E fixture - NOT AI")


@app.post("/v1/chat/completions")
async def completion(request: Request):
    body = await request.json()
    if body["model"] == "fail-model":
        from fastapi.responses import JSONResponse

        return JSONResponse({"error": "fixture failure"}, status_code=401)
    messages = body["messages"]
    system = messages[0]["content"]
    context = "\n".join(m["content"] for m in messages)
    path = re.search(r"FILE: ([^\n]+)", context)
    source = path.group(1) if path else "auth.py"
    if "JSON object matching" in system:
        content = json.dumps(
            {
                "summary": "TEST FIXTURE: The uploaded sample has a hardcoded credential. This deterministic result is not an AI assessment.",
                "issues": [
                    {
                        "severity": "high",
                        "file": source,
                        "line": 1,
                        "title": "Hardcoded credential",
                        "description": "Move credentials out of source control.",
                        "recommendation": "Use environment configuration and rotate exposed secrets.",
                    }
                ],
                "recommendations": [
                    "Add input validation and meaningful regression tests."
                ],
                "artifact": "# Test fixture artifact\n\n## Setup guide\nInstall project dependencies.\n\n## API documentation\nDocument endpoints from the uploaded code.\n\n## Architecture\nSource code flows from the browser through the backend to PostgreSQL.",
            }
        )
    elif "supplied source code" in system:
        content = f"TEST FIXTURE: Authentication code is in `{source}:1`. This response verifies code context transport, not model intelligence."
    else:
        content = "TEST FIXTURE: OK"
    return {"choices": [{"message": {"role": "assistant", "content": content}}]}
