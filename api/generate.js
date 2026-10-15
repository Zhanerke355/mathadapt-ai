export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is missing in Vercel Environment Variables.",
    });
  }

  try {
    const {
      level = 1,
      problem = "",
      userAnswer = "",
      action = "generate",
    } = req.body || {};

    let prompt;

    if (action === "feedback") {
      prompt = `
You are a careful mathematics teacher.
Check the student's answer to a quadratic equation.
Explain whether it is correct and why.
If it is incorrect, give a helpful hint without immediately
revealing the complete solution.

Problem: ${problem}
Student's answer: ${userAnswer}

Use simple, encouraging English.
Check the mathematics carefully.
`;
    } else {
      const levelName =
        Number(level) === 1
          ? "Foundation"
          : Number(level) === 2
          ? "Standard"
          : "Advanced";

      prompt = `
You are MathAdapt AI, a mathematics teacher.
Create ONE correct quadratic equation task for a student.

Difficulty: ${levelName}

Rules:
- Foundation: simple factorisation, integer roots.
- Standard: a more challenging quadratic equation.
- Advanced: a multi-step quadratic equation problem.
- Verify the answer mathematically.
- Keep the task appropriate for the chosen level.
- Use simple English.

Return exactly these four sections:

PROBLEM:
Write the question.

HINT:
Give one useful hint without revealing the answer.

STEP-BY-STEP SOLUTION:
Show the mathematical steps clearly.

FINAL ANSWER:
Give the correct answer.
`;
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(response.status).json({
        error:
          data.error?.message ||
          "Groq API request failed.",
      });
    }

    const text =
      data.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(502).json({
        error: "Groq returned an empty response.",
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("MathAdapt API error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error.",
    });
  }
}
