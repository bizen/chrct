"use action";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const activate = action({
    args: { key: v.string(), instanceName: v.string() },
    handler: async (ctx, args) => {
        const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                license_key: args.key,
                instance_name: args.instanceName
            })
        });

        if (!response.ok) {
            const text = await response.text();
            // Try to parse JSON error if possible
            try {
                const json = JSON.parse(text);
                return { success: false, error: json.error || text, status: response.status };
            } catch {
                return { success: false, error: text, status: response.status };
            }
        }

        const data = await response.json();
        return { success: true, data };
    },
});

export const validate = action({
    args: { key: v.string(), instanceId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                license_key: args.key,
                instance_id: args.instanceId
            })
        });

        if (!response.ok) {
            const text = await response.text();
            try {
                const json = JSON.parse(text);
                return { success: false, error: json.error || text, status: response.status };
            } catch {
                return { success: false, error: text, status: response.status };
            }
        }

        const data = await response.json();
        return { success: true, data };
    },
});
