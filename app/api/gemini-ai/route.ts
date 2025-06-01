import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Define function declarations for trip-specific AI features
const functionDeclarations: any = [
  {
    name: 'getTripWeather',
    description: 'Get weather forecast for the current trip dates and location.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Specific date to check weather for (YYYY-MM-DD). If not provided, returns weather for all trip dates.',
        }
      }
    }
  },
  {
    name: 'getTripActivities',
    description: 'Get information about planned activities for the trip.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Specific date to get activities for (YYYY-MM-DD). If not provided, returns all activities.',
        },
        category: {
          type: SchemaType.STRING,
          description: 'Category of activity (e.g., "Attractions", "Events", "Restaurants", "Other").',
          enum: ['Attractions', 'Events', 'Restaurants', 'Other']
        }
      }
    }
  },
  {
    name: 'getTripMemories',
    description: 'Get memories from the trip.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Specific date to get memories for (YYYY-MM-DD). If not provided, returns all memories.',
        }
      }
    }
  },
  {
    name: 'getTripTravelInfo',
    description: 'Get travel information for trip members.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        memberId: {
          type: SchemaType.STRING,
          description: 'ID of the trip member to get travel info for. If not provided, returns info for all members.',
        }
      }
    }
  }
];

export async function POST(req: Request) {
  try {
    const { trip, members, question } = await req.json();
    console.log("Received AI request:", { trip, members, question });

    if (!trip || !members || !question) {
      console.error("Missing required parameters:", { trip, members, question });
      return NextResponse.json(
        { error: 'Missing required parameters', details: 'trip, members, and question are required' },
        { status: 400 }
      );
    }

    // Add trip context to the prompt
    const tripContext = `Current Trip: ${trip.name}\nLocation: ${trip.destination}\nDates: ${trip.start_date} to ${trip.end_date}\nMembers: ${members.map((m: any) => `${m.profile?.full_name} (${m.travel_method})`).join(', ')}`;
    console.log("Generated trip context:", tripContext);

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro-latest',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    console.log("Sending request to Gemini AI");
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${tripContext}\n\nUser: ${question}` }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });

    console.log("Received response from Gemini AI");
    const response = await result.response;
    const text = response.text();
    console.log("Processed AI response:", { text });

    return NextResponse.json({
      text
    });
  } catch (error) {
    console.error('AI API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process AI request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 