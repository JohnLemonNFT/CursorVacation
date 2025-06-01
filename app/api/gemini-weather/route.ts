import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { destination, startDate, endDate, question } = await req.json();
    console.log("Received request with:", { destination, startDate, endDate, question });

    // Use the question if provided, otherwise default to weather prompt
    const prompt = question
      ? question
      : `What is the weather forecast for ${destination} from ${startDate} to ${endDate}? Please summarize it for a family trip.`;
    
    console.log("Using prompt:", prompt);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set in environment variables");
      return NextResponse.json({ error: "GEMINI_API_KEY is not set in environment variables." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Initialized GoogleGenerativeAI client");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
      console.log("Got generative model");
      
      const result = await model.generateContent(prompt);
      console.log("Generated content");
      
      const response = await result.response;
      const summary = response.text() || "No answer available.";
      console.log("Successfully generated summary");

      return NextResponse.json({ summary });
    } catch (modelError: any) {
      console.error("Error during model generation:", modelError);
      return NextResponse.json({ 
        error: "Error generating content", 
        details: modelError.message 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error?.message 
    }, { status: 500 });
  }
} 