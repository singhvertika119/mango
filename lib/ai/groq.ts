const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  model = "openai/gpt-oss-120b",
  temperature = 0.2
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    // If not configured, return a helpful offline mock response
    console.warn("GROQ_API_KEY is missing. Operating in AI offline mode.");
    return `[AI Offline Mode] I received your message. To get real AI responses, please configure your GROQ_API_KEY in .env.local.\n\nYour message was: "${messages[messages.length - 1]?.content}"`;
  }

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 2048
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "No response received from Groq.";
  } catch (err: any) {
    console.error("Error in Groq API request:", err);
    throw err;
  }
}
