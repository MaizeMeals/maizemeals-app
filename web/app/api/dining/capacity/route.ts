// app/api/dining/capacity/route.ts
import { NextResponse } from 'next/server';
import { ExternalApiResponseSchema, CapacityApiResponse } from '@/lib/api-types';

export const revalidate = 30;

export async function GET() {
  const API_URL = process.env.MDINING_BASE_URL;
  const API_KEY = process.env.MDINING_API_KEY;

  if (!API_URL || !API_KEY) {
    return NextResponse.json({ error: "Missing Env" }, { status: 500 });
  }

  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const endpoint = `${baseUrl}/dining/capacity?key=${API_KEY}`;

  try {
    const res = await fetch(endpoint, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`External API error: ${res.status}`);

    const rawData = await res.json();

    const result = ExternalApiResponseSchema.safeParse(rawData);

    if (!result.success) {
      console.error("Validation Failed:", result.error.format());
      return NextResponse.json({ error: "Invalid data from University API" }, { status: 502 });
    }

    const cleanData = result.data.capacity.map((hall) => ({
      name: hall.name,
      current_capacity: hall.capacity_count,
      total_capacity: hall.total,
      patron_flow: hall.patronflow,
      is_error: hall.error !== "no errors" && hall.error !== undefined
    }));

    // Return strict typed response
    const response: CapacityApiResponse = {
      data: cleanData,
      last_updated: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Capacity Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
