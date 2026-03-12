const AI_QUIZ_API_URL =
    process.env.AI_QUIZ_API_URL ?? "http://localhost:8000/ai-quiz";

export async function POST(request: Request) {
    const body = await request.json();

    try {
        const response = await fetch(AI_QUIZ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        let data: unknown = null;
        try {
            data = await response.json();
        } catch {
            data = { status: response.status, ok: response.ok };
        }

        // eslint-disable-next-line no-console
        console.warn("[ai-quiz] Response:\n", JSON.stringify(data, null, 2));

        return Response.json({ ok: true, data });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[ai-quiz] Error:", error);
        return Response.json(
            { ok: false, error: "Failed to reach AI quiz API" },
            { status: 500 },
        );
    }
}
