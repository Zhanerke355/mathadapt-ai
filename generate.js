
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Only POST requests are allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "API key is not configured on the server."
    });
  }

  const { level, problem, userAnswer, action } = req.body || {};

  const levelInstructions = {
    Foundation:
      "Use simple numbers, short steps, and very clear hints for a beginner.",
    Standard:
      "Use a normal school-level quadratic equation and explain the method.",
    Advanced:
      "Use a multi-step or real-world quadratic problem with deeper reasoning."
  };

  if (!levelInstructions[level]) {
    return res.status(400).json({
      error: "Please select a valid difficulty level."
    });
  }

  let prompt;

  if (action === "feedback" && problem && userAnswer !== undefined) {
    prompt = `
You are MathAdapt AI, a mathematics tutor.
Topic: quadratic equations.
Student level: ${level}.
Level guidance: ${levelInstructions[level]}
Problem: ${problem}
Student's answer: ${userAnswer}

Check the answer carefully.
Give supportive, level-appropriate feedback.
If incorrect, explain the first mistake and give one useful hint.
If correct, explain briefly why it is correct.
Do not claim an answer is correct unless you have checked it.
Use clear plain text.
`;
  } else {
    prompt = `
You are MathAdapt AI, a mathematics teacher.
Topic: quadratic equations.
Student level: ${level}.
Level guidance: ${levelInstructions[level]}

Generate ONE new, mathematically correct quadratic-equation task.
Return these four sections:
PROBLEM:
HINT:
STEP-BY-STEP SOLUTION:
FINAL ANSWER:

Adapt the numbers, context, and explanation to the chosen level.
Check the solution by substituting the answer into the original equation.
Use clear plain text and readable mathematical notation.
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
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: "The AI service could not complete the request. Please try again."
      });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n");

    if (!text) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
