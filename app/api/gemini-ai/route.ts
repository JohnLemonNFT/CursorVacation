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
      },
      tools: [
        { functionDeclarations }
      ]
    });

    console.log("Received response from Gemini AI");
    const response = await result.response;
    const functionCalls = response.candidates?.[0]?.content?.parts?.filter(part => part.functionCall) || [];
    const text = response.text();
    console.log("Processed AI response:", { text, functionCalls });

    // Process function calls and get their results
    const functionResults = [];
    for (const call of functionCalls) {
      if (call.functionCall) {
        console.log("Processing function call:", call.functionCall.name);
        let result;
        try {
          switch (call.functionCall.name) {
            case 'getTripWeather':
              result = await fetch('/api/gemini-weather', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  destination: trip.destination,
                  startDate: trip.start_date,
                  endDate: trip.end_date,
                  date: call.functionCall.args && typeof call.functionCall.args === 'object' ? (call.functionCall.args as any).date : undefined
                })
              }).then(res => res.json());
              break;
            case 'getTripActivities':
              // TODO: Implement activity fetching from your database
              result = { message: "Activity information will be available soon." };
              break;
            case 'getTripMemories':
              // TODO: Implement memory fetching from your database
              result = { message: "Memory information will be available soon." };
              break;
            case 'getTripTravelInfo':
              // TODO: Implement travel info fetching from your database
              result = { message: "Travel information will be available soon." };
              break;
          }
          console.log("Function call result:", { name: call.functionCall.name, result });
        } catch (error) {
          console.error("Error processing function call:", { name: call.functionCall.name, error });
          result = { error: "Failed to process function call" };
        }
        functionResults.push({ name: call.functionCall.name, result });
      }
    }

    return NextResponse.json({
      text,
      functionCalls,
      functionResults
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