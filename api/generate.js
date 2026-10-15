
export default async function handler(req, res) {
  // 1. Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  // 2. Read the API key securely from Vercel
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing.");

    return res.status(500).json({
      error: "API key is missing. Check Vercel Environment Variables."
    });
  }

  // 3. Read data sent by the website
  const { level, problem, userAnswer, action } = req.body || {};

  // 4. Define difficulty levels
  const levelInstructions = {
    Foundation:
      "Use simple quadratic equations. Explain every step in beginner-friendly language.",

    Standard:
      "Use school-level quadratic equations. Explain the method and show all important steps.",

    Advanced:
      "Use challenging multi-step or real-world quadratic problems. Explain the reasoning carefully."
  };

  if (!levelInstructions[level]) {
    return res.status(400).json({
      error: "Invalid difficulty level."
    });
  }

  // 5. Create the AI prompt
  let prompt;

  if (action === "feedback") {
    if (!problem || userAnswer === undefined) {
      return res.status(400).json({
        error: "A problem and student answer are required."
      });
    }

    prompt = `
You are MathAdapt AI, a supportive mathematics tutor.

Difficulty level: ${level}
Question: ${problem}
Student's answer: ${userAnswer}

Check the student's answer carefully.
Explain whether it is correct or incorrect.
If incorrect, explain the mistake kindly and give a useful next step.
If correct, explain briefly why it is correct.
Do not reveal the full solution immediately when the answer is incorrect.
Use clear, simple language.
`;
  } else {
    prompt = `
You are MathAdapt AI, a mathematics teacher.

Create ONE quadratic equation task for the following level:
${level}

Requirements:
${levelInstructions[level]}

Check the mathematical solution before responding.
Make sure the final answer is correct.
Use these exact headings:

PROBLEM:
Write the question.

HINT:
Give a helpful hint without immediately revealing the answer.

STEP-BY-STEP SOLUTION:
Explain the solution step by step.

FINAL ANSWER:
State the correct final answer.
`;
  }

  // 6. Send the request to Google Gemini
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
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await response.json();

    // 7. Handle errors returned by Google
    if (!response.ok) {
      console.error(
        "Gemini API error:",
        response.status,
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          data.error?.message ||
          "The AI service request failed. Check the API key and model access."
      });
    }

    // 8. Extract the generated text
    const generatedText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!generatedText) {
      console.error(
        "Gemini returned no text:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    // 9. Send the answer back to the website
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

