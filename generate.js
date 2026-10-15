export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is missing in Vercel Environment Variables."
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
You are MathAdapt AI, a supportive mathematics teacher.

Check the student's answer to the quadratic equation.

Problem: ${problem}
Student's answer: ${userAnswer}

Explain whether the answer is correct.
If incorrect, explain the mistake and give a helpful hint.
Do not immediately reveal the full solution.
Use simple, encouraging English.
Check the mathematics carefully.
`;
    } else {
      let levelName = "Foundation";

      if (Number(level) === 2) {
        levelName = "Standard";
      } else if (Number(level) === 3) {
        levelName = "Advanced";
      }

      prompt = `
You are MathAdapt AI, a careful mathematics teacher.

Create ONE quadratic equation task.

Student level: ${levelName}

Requirements:
- Foundation: simple factorisation with integer roots.
- Standard: a moderately challenging quadratic equation.
- Advanced: a multi-step quadratic equation problem.
- Ensure the equation and its answer are mathematically correct.
- Use simple English.
- Make the task appropriate for the selected level.

Return exactly these four sections:

PROBLEM:
Write the question.

HINT:
Give one useful hint without revealing the answer.

STEP-BY-STEP SOLUTION:
Explain each mathematical step clearly.

FINAL ANSWER:
Give the correct final answer.
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

