import { useState } from "react";

const SUGGESTIONS = [
  "What should I pack for this trip?",
  "What's the weather like during my trip?",
  "Suggest family-friendly activities nearby.",
  "What are some local foods to try?",
  "How do I get from the airport to my hotel?",
];

export function TripAI({ trip, members }: { trip: any, members: any[] }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async (question: string) => {
    setLoading(true);
    setError("");
    setMessages((msgs) => [...msgs, { role: "user", text: question }]);
    
    try {
      const res = await fetch("/api/gemini-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip, members, question }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || "Failed to get AI response");
      }

      const data = await res.json();
      
      // Process function results and combine with text response
      let responseText = data.text || "";
      if (data.functionResults && data.functionResults.length > 0) {
        responseText += "\n\nAdditional Information:\n";
        data.functionResults.forEach((result: any) => {
          if (result.result.summary) {
            responseText += `\n${result.result.summary}`;
          } else if (result.result.message) {
            responseText += `\n${result.result.message}`;
          }
        });
      }

      setMessages((msgs) => [...msgs, { role: "ai", text: responseText }]);
    } catch (err) {
      console.error("AI response error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get AI response";
      setError(errorMessage);
      setMessages((msgs) => [...msgs, { role: "ai", text: `Error: ${errorMessage}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow mt-6">
      <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
        <span role="img" aria-label="AI">✨</span> AI Assistant
      </h2>
      <div className="mb-3 text-gray-600 text-sm">How can I help with your trip to <span className="font-semibold">{trip.destination}</span>?</div>
      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm border border-blue-200"
            onClick={() => sendMessage(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mb-4 max-h-64 overflow-y-auto bg-gray-50 rounded p-2">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right mb-2" : "text-left mb-2"}>
            <span className={msg.role === "user" ? "inline-block bg-blue-100 text-blue-900 px-2 py-1 rounded" : "inline-block bg-gray-200 text-gray-800 px-2 py-1 rounded"}>
              {msg.text}
            </span>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Thinking...</div>}
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage(input.trim());
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Ask a question about your trip..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-vault-purple text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
} 