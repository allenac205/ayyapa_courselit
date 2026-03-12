const LEARNING_SUGGESTIONS_API_URL =
    process.env.LEARNING_SUGGESTIONS_API_URL ??
    "http://localhost:8000/learning-suggestions";

export async function POST(request: Request) {
    const body = await request.json();

    try {
        const response = await fetch(LEARNING_SUGGESTIONS_API_URL, {
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

        // Stable JSON structure to be reused later for AI / OpenAI calls.
        // eslint-disable-next-line no-console
        console.warn(
            "[ai-learning-suggestions] Response:\n",
            JSON.stringify(data, null, 2),
        );

        return Response.json({ ok: true, data });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[ai-learning-suggestions] Error:", error);
        return Response.json(
            { ok: false, error: "Failed to reach learning-suggestions API" },
            { status: 500 },
        );
    }
}
