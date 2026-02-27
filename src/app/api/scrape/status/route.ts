import { NextResponse } from 'next/server';
import { getScrapeStatus } from '../route';

export async function GET() {
    const status = getScrapeStatus();
    return NextResponse.json(status);
}
