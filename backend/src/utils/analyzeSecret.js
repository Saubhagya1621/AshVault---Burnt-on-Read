import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const analyzeSecretSensitivity = async (content) => {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `You are a security classifier for a burn-after-read secret sharing app. Analyze the following secret content and respond with ONLY a JSON object, no other text, no markdown fences.

Schema:
{
  "isSensitive": boolean,
  "category": string, // one of: "password", "api_key", "pii", "financial", "personal_message", "other"
  "suggestedTTL": string, // one of: "1h", "24h", "7d"
  "reason": string // max 10 words, why this classification
}

Content to analyze:
"""
${content}
"""`,
                },
            ],
        });

        const rawText = response.choices[0]?.message?.content || "";
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("Sensitivity analysis failed (non-blocking):", err.message);
        return null;
    }
};

export { analyzeSecretSensitivity };