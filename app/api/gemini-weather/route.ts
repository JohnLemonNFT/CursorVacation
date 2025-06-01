import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { destination, startDate, endDate, question } = await req.json();

  // Use the question if provided, otherwise default to weather prompt
  const prompt = question
    ? question
    : `What is the weather forecast for ${destination} from ${startDate} to ${endDate}? Please summarize it for a family trip.`;

  const apiKey = process.env.GEMINI_API_KEY;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!geminiRes.ok) {
    return NextResponse.json({ error: "Failed to fetch from Gemini" }, { status: 500 });
  }

  const geminiData = await geminiRes.json();
  const summary = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "No answer available.";

  return NextResponse.json({ summary });
} 