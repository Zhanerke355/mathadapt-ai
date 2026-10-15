export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is missing. Check Vercel Environment Variables."
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

Check the student's answer.

Math problem: ${problem}
Student's answer: ${userAnswer}

Explain whether the answer is correct.
If it is incorrect, explain the mistake and give a helpful hint.
Do not immediately reveal the complete solution.
Use simple English and check the mathematics carefully.
`;
    } else {
      const levelName =
        Number(level) === 1
          ? "Foundation"
          : Number(level) === 2
          ? "Standard"
          : "Advanced";

      const levelRules =
        Number(level) === 1
          ? "Use simple quadratic equations that factorise easily and have integer roots."
          : Number(level) === 2
          ? "Use moderately challenging quadratic equations, including factorisation or the quadratic formula."
          : "Use multi-step quadratic problems that require careful mathematical reasoning.";

      prompt = `
You are MathAdapt AI, a careful mathematics teacher.

Create one original quadratic equation exercise.

Difficulty: ${levelName}
Requirements: ${levelRules}

Check the mathematical answer before responding.
Use simple English and show all important calculation steps.

Return exactly these four sections:

PROBLEM:
Write one clear question.

HINT:
Give a helpful hint without revealing the final answer.

STEP-BY-STEP SOLUTION:
Explain the solution step by step.

FINAL ANSWER:
State the correct final answer.
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
          max_completion_tokens: 2000,
          temperature: 0.2,
          stream: false,
          include_reasoning: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", data);

      return res.status(response.status).json({
        error:
          data.error?.message ||
          "The Groq API request failed."
      });
    }

    const generatedText =
      data.choices?.[0]?.message?.content;

    if (!generatedText) {
      return res.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    return res.status(200).json({
      text: generatedText
    });

  } catch (error) {
    console.error("MathAdapt AI error:", error);

    return res.status(500).json({
      error: error.message || "Internal server error."
    });
  }
}

