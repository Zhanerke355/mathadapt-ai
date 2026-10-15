
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured on the server." });
  }

  const { level, problem, userAnswer, action } = req.body || {};

  const instructions = {
    Foundation: "Use simple equations and explain every step for beginners.",
    Standard: "Use school-level quadratic equations and explain the method.",
    Advanced: "Use challenging multi-step quadratic problems."
  };

  if (!instructions[level]) {
    return res.status(400).json({ error: "Invalid difficulty level." });
  }

  const prompt = action === "feedback"
    ? `You are a kind mathematics tutor. Difficulty: ${level}. Question: ${problem}. Student answer: ${userAnswer}. Check the answer, explain any mistake, and give a helpful next step.`
    : `You are MathAdapt AI, a mathematics teacher. Create a quadratic equation task for ${level}. ${instructions[level]} Verify the mathematics. Respond with these headings: PROBLEM:, HINT:, STEP-BY-STEP SOLUTION:, FINAL ANSWER:.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      return res.status(502).json({ error: "AI service request failed. Please try again." });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n");

    if (!text) {
      return res.status(502).json({ error: "AI returned an empty response." });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

