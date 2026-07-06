import { NextResponse, type NextRequest } from 'next/server';

/** @deprecated Usa POST /api/payments/complete-demo */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const res = await fetch(new URL('/api/payments/complete-demo', request.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, kind: 'gift_card' }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
