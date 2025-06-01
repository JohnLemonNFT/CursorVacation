import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { destination, startDate, endDate, question } = await req.json();

    // Use the question if provided, otherwise default to weather prompt
    const prompt = question
      ? question
      : `What is the weather forecast for ${destination} from ${startDate} to ${endDate}? Please summarize it for a family trip.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set in environment variables." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-pro",
      contents: prompt
    });
    const summary = result.text || "No answer available.";

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
} 