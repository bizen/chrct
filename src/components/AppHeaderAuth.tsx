import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

export function AppHeaderAuth() {
  return (
    <>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="primary-btn app-header-sign-in">
            sign in
          </button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
