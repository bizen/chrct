"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Groq from "groq-sdk";

export const deconstructTask = action({
    args: { taskName: v.string() },
    handler: async (_ctx, args) => {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a helpful task management assistant. 
          Your goal is to break down a large task into 3-5 smaller, actionable subtasks.
          Return ONLY a raw JSON array of strings. Do not include markdown formatting like \`\`\`json.
          Example: ["Research topic", "Draft outline", "Write introduction"]`
                },
                {
                    role: "user",
                    content: args.taskName
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        const responseContent = completion.choices[0]?.message?.content || "[]";

        // Clean up response if it contains markdown code blocks
        const cleanContent = responseContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        try {
            const subtasks = JSON.parse(cleanContent);
            if (Array.isArray(subtasks)) {
                return subtasks.map(String);
            }
            return [];
        } catch (e) {
            console.error("Failed to parse Groq response:", responseContent);
            return [];
        }
    },
});
