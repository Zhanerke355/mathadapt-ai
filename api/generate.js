
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is missing in Vercel."
    });
  }

  try {
    const {
      level = 1,
      problem = "",
      userAnswer = "",
      action = "generate"
    } = req.body || {};

    let prompt;

    if (action === "feedback") {
      prompt = `
You are MathAdapt AI, a friendly mathematics teacher.

Problem: ${problem}
Student answer: ${userAnswer}

Check the answer carefully.
Explain whether it is correct.
If it is wrong, give a helpful hint without revealing the full solution.
Use simple English.
`;
    } else {
      const levels = {
        1: "Foundation: simple quadratic equations with integer roots, solved by factorisation.",
        2: "Standard: moderately challenging quadratic equations using factorisation or the quadratic formula.",
        3: "Advanced: multi-step quadratic equation problems requiring careful reasoning."
      };

      const difficulty =
        levels[Number(level)] || levels[1];

      prompt = `
You are MathAdapt AI, a careful mathematics teacher.

Create one original quadratic equation exercise.

Difficulty:
${difficulty}

Requirements:
- Make sure the problem has a mathematically correct solution.
- Explain the calculations step by step.
- Use simple English.
- Give a hint without revealing the final answer.

Return exactly these four sections:

PROBLEM:
Write the question.

HINT:
Give one helpful hint.

STEP-BY-STEP SOLUTION:
Explain every important step.

FINAL ANSWER:
Give the correct answer.
`;
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_completion_tokens: 2000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(response.status).json({
        error:
          data.error?.message ||
          "Groq API request failed."
      });
    }

    const answer =
      data.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    return res.status(200).json({
      text: answer
    });

  } catch (error) {
    console.error("MathAdapt API error:", error);

    return res.status(500).json({
      error: error.message ||
        "Internal server error."
    });
  }
}
