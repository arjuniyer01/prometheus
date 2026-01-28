import { inngest } from "../../../../inngest/client";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { ticker } = await request.json();

        if (!ticker) {
            return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
        }

        await inngest.send({
            name: "app/analyze.requested.india",
            data: { ticker: ticker.toUpperCase() },
        });

        return NextResponse.json({ success: true, message: "Indian analysis queued" });
    } catch (error: any) {
        console.error("Inngest Trigger Error (India):", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
