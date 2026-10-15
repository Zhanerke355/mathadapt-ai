
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing.");

    return res.status(500).json({
      error: "API key is missing. Check Vercel Environment Variables."
    });
  }

  const { level, problem, userAnswer, action } = req.body || {};

  const levelInstructions = {
    Foundation:
      "Use simple quadratic equations. Explain every step for beginners.",
    Standard:
      "Use school-level quadratic equations. Explain the method clearly.",
    Advanced:
      "Use challenging multi-step or real-world quadratic problems."
  };

  if (!levelInstructions[level]) {
    return res.status(400).json({
      error: "Invalid difficulty level."
    });
  }

  let prompt;

  if (action === "feedback") {
    if (!problem || userAnswer === undefined) {
      return res.status(400).json({
        error: "A problem and student answer are required."
      });
    }

    prompt = `
You are MathAdapt AI, a kind mathematics tutor.

Difficulty: ${level}
Question: ${problem}
Student answer: ${userAnswer}

Check the answer mathematically.
Explain whether it is correct.
If incorrect, explain the mistake and give a helpful next step.
If correct, explain briefly why.
Use clear, simple language.
`;
  } else {
    prompt = `
You are MathAdapt AI, a mathematics teacher.

Create one quadratic equation task for the ${level} level.
${levelInstructions[level]}

Check the solution mathematically before responding.

Use exactly these headings:

PROBLEM:
Write the question.

HINT:
Give a useful hint without revealing the full answer.

STEP-BY-STEP SOLUTION:
Explain the solution step by step.

FINAL ANSWER:
Give the correct final answer.
`;
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          data.error?.message ||
          "Gemini API request failed. Please check the API key and model."
      });
    }

    const generatedText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!generatedText) {
      console.error("Gemini returned no text:", JSON.stringify(data));

      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    return res.status(200).json({
      text: generatedText
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "The server could not connect to the AI service."
    });
  }
}
