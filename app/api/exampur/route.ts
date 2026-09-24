import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbxniOfPnd9v4t01Xr0Wcg4XbfzlmnkaypIELQTz0v_SBvP1WhC8FQOB2EB5BIJdpko/exec";

export async function GET(request: NextRequest) {
  const incoming = new URL(request.url);
  const upstream = new URL(BACKEND_URL);

  incoming.searchParams.forEach((value, key) => {
    upstream.searchParams.set(key, value);
  });

  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(75_000),
    });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        ok: false,
        error: "Google Sheet backend returned an invalid response.",
      };
    }
    return NextResponse.json(payload, {
      status: response.ok ? 200 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Google Sheet backend is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  try {
    // Admission writes are idempotent in the backend: retrying the same mobile
    // either creates the record once or returns that already-approved record.
    // Google Apps Script can briefly hold a sheet lock after an inquiry write,
    // so retry only these two safe admission actions before reporting failure.
    const admissionAction =
      payload.action === "approveStudent" ||
      payload.action === "approvePendingStudent";
    let lastResult: unknown = null;
    let lastStatus = 502;

    for (let attempt = 0; attempt < (admissionAction ? 3 : 1); attempt += 1) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 900));
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "follow",
        signal: AbortSignal.timeout(75_000),
      });
      const text = await response.text();
      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        result = {
          ok: false,
          error: "Google Sheet backend returned an invalid response.",
        };
      }
      lastResult = result;
      lastStatus = response.ok ? 200 : 502;
      if (result?.ok !== false || !admissionAction) break;

      const message = String(result?.error || result?.message || "");
      if (!/lock|timeout|temporarily unavailable|service invoked|internal error/i.test(message)) break;
    }

    return NextResponse.json(lastResult, {
      status: lastStatus,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Google Sheet backend is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
