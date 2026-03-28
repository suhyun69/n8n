from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
import httpx
import json

app = FastAPI(title="API Flow Tester - Proxy Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProxyRequest(BaseModel):
    method: str
    url: str
    headers: Optional[dict[str, str]] = {}
    params: Optional[dict[str, str]] = {}
    data: Optional[Any] = None


class ProxyResponse(BaseModel):
    status: int
    statusText: str
    headers: dict[str, str]
    data: Any


@app.post("/api/proxy", response_model=ProxyResponse)
async def proxy(req: ProxyRequest):
    """
    브라우저 CORS 제한을 우회하여 외부 API로 요청을 전달합니다.
    """
    method = req.method.upper()

    # body 처리
    content_type = (req.headers or {}).get("Content-Type", "application/json")
    body_kwargs: dict[str, Any] = {}

    if req.data is not None:
        if "application/json" in content_type:
            body_kwargs["json"] = req.data
        elif "application/x-www-form-urlencoded" in content_type:
            body_kwargs["data"] = req.data
        else:
            body_kwargs["content"] = str(req.data).encode()

    # 헤더 값의 개행/탭 등 illegal 문자 제거
    clean_headers = {
        k.strip(): v.strip().replace("\n", "").replace("\r", "").replace("\t", "")
        for k, v in (req.headers or {}).items()
        if k.strip() and v.strip()
    }

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.request(
            method=method,
            url=req.url,
            headers=clean_headers,
            params=req.params or {},
            **body_kwargs,
        )

    # 응답 파싱
    try:
        response_data = response.json()
    except Exception:
        response_data = response.text

    return ProxyResponse(
        status=response.status_code,
        statusText=_status_text(response.status_code),
        headers=dict(response.headers),
        data=response_data,
    )


def _status_text(code: int) -> str:
    texts = {
        200: "OK", 201: "Created", 204: "No Content",
        400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
        404: "Not Found", 409: "Conflict", 422: "Unprocessable Entity",
        500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable",
    }
    return texts.get(code, "Unknown")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
