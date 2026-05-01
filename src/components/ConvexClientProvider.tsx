import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { clerkPublishableKey, convexUrl } from "../lib/cloudConfig";

let convex: ConvexReactClient | undefined;
try {
    if (convexUrl) {
        convex = new ConvexReactClient(convexUrl);
    }
} catch (error) {
    console.error("Failed to initialize Convex client:", error);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    if (!convex || !clerkPublishableKey) {
        if (import.meta.env.DEV) {
            console.warn(
                "[chrct] Convex / Clerk env vars are missing. Tasks page will be disabled, character counter still works."
            );
        }
        return <>{children}</>;
    }

    return (
        <ClerkProvider publishableKey={clerkPublishableKey}>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
