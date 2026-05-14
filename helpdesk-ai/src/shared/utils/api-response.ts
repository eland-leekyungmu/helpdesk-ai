import { NextResponse } from "next/server";
import type { ApiSuccessResponse, ApiErrorResponse } from "../types/api";

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false, error: { code, message, ...extra } } as ApiErrorResponse,
    { status }
  );
}
