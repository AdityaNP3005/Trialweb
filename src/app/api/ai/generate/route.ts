import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { buildCardPrompt } from "@/lib/ai/prompt";
import { aiRequestSchema, aiResponseSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const DAILY_LIMIT = 20;
const usage = new Map<string, { date: string; count: number }>();

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function overLimit(uid: string): boolean {
    const today = todayKey();
    const entry = usage.get(uid);
    if (!entry || entry.date !== today) {
        usage.set(uid, { date: today, count: 1 });
        return false;
    }
    if (entry.count >= DAILY_LIMIT) return true;
    entry.count += 1;
    return false;
}

function extractJson(text: string): unknown {
    const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object in response");
    return JSON.parse(trimmed.slice(start, end + 1));
}

export async function POST(request: NextRequest) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const adminAuth = getAdminAuth();

    if (!apiKey || !adminAuth) {
        return NextResponse.json(
            { error: "AI is not configured on this deployment." },
            { status: 503 },
        );
    }

    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    let uid: string;
    try {
        uid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = aiRequestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (overLimit(uid)) {
        return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let upstream: Response;
    try {
        upstream = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: buildCardPrompt(parsed.data) }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                },
            }),
        });
    } catch {
        return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }

    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        return NextResponse.json(
            { error: "Gemini request failed", detail: detail.slice(0, 300) },
            { status: 502 },
        );
    }

    const payload = (await upstream.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    try {
        const validated = aiResponseSchema.parse(extractJson(text));
        return NextResponse.json({ cards: validated.cards.slice(0, parsed.data.count) });
    } catch {
        return NextResponse.json(
            { error: "Model returned an invalid card list" },
            { status: 502 },
        );
    }
}
