import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Safely initialize client only if URL is present
let convex: ConvexReactClient | undefined;
try {
    if (convexUrl) {
        convex = new ConvexReactClient(convexUrl);
    }
} catch (error) {
    console.error("Failed to initialize Convex client:", error);
    // convex remains undefined, which will trigger the error UI below
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    if (!convex || !publishableKey) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#EF4444' }}>Configuration Error</h2>
                <p>Missing environment variables.</p>
                <div style={{ textAlign: 'left', background: '#1e293b', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                    <p style={{ color: convex ? '#10B981' : '#EF4444' }}>
                        VITE_CONVEX_URL: {convex ? 'Set' : 'Missing'}
                    </p>
                    <p style={{ color: publishableKey ? '#10B981' : '#EF4444' }}>
                        VITE_CLERK_PUBLISHABLE_KEY: {publishableKey ? 'Set' : 'Missing'}
                    </p>
                </div>
                <p style={{ marginTop: '2rem', opacity: 0.8 }}>Please check your Vercel Project Settings and Redeploy.</p>
            </div>
        );
    }

    return (
        <ClerkProvider publishableKey={publishableKey}>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                {children}
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
