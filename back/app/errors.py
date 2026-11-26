from __future__ import annotations

from typing import Any


class ApiError(Exception):
    """Uniform API error; rendered with the contract error envelope."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []
        super().__init__(message)


def bad_request(code: str, message: str) -> ApiError:
    return ApiError(400, code, message)


def unauthorized(message: str = "未认证") -> ApiError:
    return ApiError(401, "UNAUTHENTICATED", message)


def forbidden(message: str = "无权访问该对象") -> ApiError:
    return ApiError(403, "FORBIDDEN", message)


def not_found(message: str = "对象不存在") -> ApiError:
    return ApiError(404, "NOT_FOUND", message)


def conflict(code: str, message: str) -> ApiError:
    return ApiError(409, code, message)


def validation_error(message: str, details: list[dict[str, Any]] | None = None) -> ApiError:
    return ApiError(422, "VALIDATION_ERROR", message, details)


def register_exception_handlers(app) -> None:  # noqa: ANN001
    import logging

    from fastapi import Request
    from fastapi.exceptions import RequestValidationError
    from fastapi.responses import JSONResponse

    logger = logging.getLogger("hcc_cip.errors")

    def envelope(request: Request, code: str, message: str, details=None) -> dict:  # noqa: ANN001
        return {
            "error": {
                "code": code,
                "message": message,
                "request_id": getattr(request.state, "request_id", "unknown"),
                "details": details or [],
            }
        }

    @app.exception_handler(ApiError)
    async def api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=envelope(request, exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": ".".join(str(part) for part in err.get("loc", [])), "message": err.get("msg", "")}
            for err in exc.errors()
        ]
        return JSONResponse(status_code=422, content=envelope(request, "VALIDATION_ERROR", "请求参数校验失败", details))

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error request_id=%s", getattr(request.state, "request_id", "unknown"))
        return JSONResponse(status_code=500, content=envelope(request, "INTERNAL_ERROR", "服务内部错误，请联系管理员"))
