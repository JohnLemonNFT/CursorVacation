import { config } from 'dotenv';
import { GoogleGenAI, FunctionCallingConfigMode, Type } from '@google/genai';

// Load environment variables
config({ path: '.env.local' });

// Access your API key as an environment variable
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// Initialize the Google Generative AI with your API key
const ai = new GoogleGenAI({ apiKey });

// Define function declarations for trip-specific AI features
const functionDeclarations = [
  {
    name: 'getTripWeather',
    parameters: {
      type: Type.OBJECT,
      description: 'Get weather forecast for the current trip dates and location.',
      properties: {
        date: {
          type: Type.STRING,
          description: 'Specific date to check weather for (YYYY-MM-DD). If not provided, returns weather for all trip dates.',
        }
      }
    }
  },
  {
    name: 'getTripActivities',
    parameters: {
      type: Type.OBJECT,
      description: 'Get information about planned activities for the trip.',
      properties: {
        date: {
          type: Type.STRING,
          description: 'Specific date to get activities for (YYYY-MM-DD). If not provided, returns all activities.',
        },
        category: {
          type: Type.STRING,
          description: 'Category of activity (e.g., "Attractions", "Events", "Restaurants", "Other").',
          enum: ['Attractions', 'Events', 'Restaurants', 'Other']
        }
      }
    }
  },
  {
    name: 'getTripMemories',
    parameters: {
      type: Type.OBJECT,
      description: 'Get memories from the trip.',
      properties: {
        date: {
          type: Type.STRING,
          description: 'Specific date to get memories for (YYYY-MM-DD). If not provided, returns all memories.',
        }
      }
    }
  },
  {
    name: 'getTripTravelInfo',
    parameters: {
      type: Type.OBJECT,
      description: 'Get travel information for trip members.',
      properties: {
        memberId: {
          type: Type.STRING,
          description: 'ID of the trip member to get travel info for. If not provided, returns info for all members.',
        }
      }
    }
  }
];

// Test queries that match real user scenarios
const testQueries = [
  {
    name: "Weather Check",
    query: "What's the weather going to be like during our trip? Should we pack any specific items?",
    context: "Planning for outdoor activities and packing"
  },
  {
    name: "Activity Planning",
    query: "We have two kids under 10. What activities would you recommend for our family?",
    context: "Family-friendly activity planning"
  },
  {
    name: "Travel Coordination",
    query: "Can you help me coordinate our arrival times? Some of us are arriving by plane and others by car.",
    context: "Travel logistics coordination"
  },
  {
    name: "Memory Capture",
    query: "What are some good prompts to help us capture meaningful memories during our trip?",
    context: "Memory journaling and documentation"
  },
  {
    name: "Local Recommendations",
    query: "What are some must-try local restaurants near our hotel? We're staying in the main tourist area.",
    context: "Local dining and experiences"
  },
  {
    name: "Packing List",
    query: "Can you help me create a packing list based on our activities and the weather forecast?",
    context: "Trip preparation and packing"
  }
];

async function runChat() {
  try {
    // Mock trip data matching your actual data structure
    const trip = {
      id: "trip_123",
      name: "Summer Disney Adventure",
      destination: "Orlando, FL",
      start_date: "2024-08-08",
      end_date: "2024-08-15",
      invite_code: "ABC123",
      shared_album_url: null,
      created_by: "user_1"
    };

    const members = [
      {
        id: "member_1",
        user_id: "user_1",
        role: "admin",
        arrival_date: "2024-08-08",
        departure_date: "2024-08-15",
        flight_details: "AA123",
        arrival_time: "10:00 AM",
        departure_time: "2:00 PM",
        travel_method: "plane",
        profile: {
          full_name: "John Doe",
          avatar_url: null,
          email: "john@example.com"
        }
      },
      {
        id: "member_2",
        user_id: "user_2",
        role: "member",
        arrival_date: "2024-08-08",
        departure_date: "2024-08-15",
        flight_details: "AA456",
        arrival_time: "11:00 AM",
        departure_time: "3:00 PM",
        travel_method: "plane",
        profile: {
          full_name: "Jane Doe",
          avatar_url: null,
          email: "jane@example.com"
        }
      }
    ];

    // Add trip context to the prompt
    const tripContext = `Current Trip: ${trip.name}
Location: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Members: ${members.map(m => `${m.profile?.full_name} (${m.travel_method})`).join(', ')}`;

    // Run each test query
    for (const test of testQueries) {
      console.log(`\n=== Testing: ${test.name} ===`);
      console.log(`Context: ${test.context}`);
      console.log(`Query: ${test.query}`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: `${tripContext}\n\nUser: ${test.query}`,
        config: {
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: ['getTripWeather', 'getTripActivities', 'getTripMemories', 'getTripTravelInfo']
            }
          },
          tools: [{ functionDeclarations }]
        }
      });

      console.log('\nResponse:');
      console.log('Function calls:', response.functionCalls);
      if (response.text) {
        console.log('Text response:', response.text);
      }
      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

runChat(); 