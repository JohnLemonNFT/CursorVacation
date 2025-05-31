import { useEffect, useState } from "react";

export function TripWeather({ destination, startDate, endDate }: { destination: string, startDate: string, endDate: string }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchWeather() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/gemini-weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination, startDate, endDate }),
        });
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
        } else {
          setError("No weather summary available.");
        }
      } catch (err) {
        setError("Failed to fetch weather summary.");
      }
      setLoading(false);
    }
    fetchWeather();
  }, [destination, startDate, endDate]);

  if (loading) return <div className="p-4 bg-white rounded shadow">Loading weather...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded shadow">{error}</div>;
  return (
    <div className="p-4 bg-blue-50 rounded shadow mb-4">
      <h3 className="font-bold mb-2 text-blue-900">Weather Forecast</h3>
      <p className="text-blue-800 whitespace-pre-line">{summary}</p>
    </div>
  );
} 