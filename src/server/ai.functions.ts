import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  destination: z.string().min(1).max(120),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().min(0).max(1000000).default(1500),
  groupSize: z.number().min(1).max(50).default(1),
  interests: z.array(z.string().max(40)).max(10).default([]),
});

const ItineraryToolSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_number: { type: "integer" },
          activities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["eat", "see", "do", "stay"] },
                start_time: { type: "string" },
                cost: { type: "number" },
                address: { type: "string" },
                notes: { type: "string" },
              },
              required: ["name", "type", "start_time", "cost"],
              additionalProperties: false,
            },
          },
        },
        required: ["day_number", "activities"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "summary", "days"],
  additionalProperties: false,
} as const;

export const generateItinerary = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof InputSchema>) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const days =
      data.startDate && data.endDate
        ? Math.max(
            1,
            Math.round(
              (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1
          )
        : 3;

    const interestsLine = data.interests.length ? `Interests: ${data.interests.join(", ")}.` : "";

    const userPrompt = `Build a ${days}-day travel itinerary for ${data.destination} for a group of ${data.groupSize}. Total budget: $${data.budget}. ${interestsLine}
Each day should mix eat / see / do / stay activities (3-5 per day). Realistic cost in USD. Use specific real venue names and short addresses where possible.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert travel planner. Always respond by calling the build_itinerary tool with realistic, specific recommendations.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "build_itinerary",
              description: "Return a structured multi-day travel itinerary.",
              parameters: ItineraryToolSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "build_itinerary" } },
      }),
    });

    if (res.status === 429)
      throw new Error("Too many requests — please wait a moment and try again.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      throw new Error("AI service is unavailable. Please try again.");
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI returned no itinerary.");
    const args = JSON.parse(call.function.arguments) as {
      title: string;
      summary: string;
      days: Array<{
        day_number: number;
        activities: Array<{
          name: string;
          type: "eat" | "see" | "do" | "stay";
          start_time: string;
          cost: number;
          address?: string;
          notes?: string;
        }>;
      }>;
    };
    return args;
  });

const RecsInput = z.object({
  destination: z.string().max(120).optional(),
  interests: z.array(z.string().max(40)).max(10).default([]),
});

export const generateRecommendations = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof RecsInput>) => RecsInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const where = data.destination || "popular global destinations";
    const interests = data.interests.length ? `Match interests: ${data.interests.join(", ")}.` : "";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a concise travel recommender." },
          {
            role: "user",
            content: `Suggest 6 trip ideas for ${where}. ${interests} Each idea should have a punchy title, the destination, and a one-sentence reason.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_trips",
              description: "Return 6 short trip ideas.",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        destination: { type: "string" },
                        reason: { type: "string" },
                        emoji: { type: "string" },
                      },
                      required: ["title", "destination", "reason", "emoji"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ideas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_trips" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    if (!res.ok) throw new Error("Recommendations unavailable.");

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return { ideas: [] as Array<{ title: string; destination: string; reason: string; emoji: string }> };
    return JSON.parse(call.function.arguments) as {
      ideas: Array<{ title: string; destination: string; reason: string; emoji: string }>;
    };
  });
