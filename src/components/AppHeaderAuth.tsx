import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

/**
 * 同期は任意。サインインしなくてもタスクはこの端末に保存される。
 */
export function AppHeaderAuth() {
  return (
    <>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="ghost-btn app-header-sign-in"
            title="サインインすると、この端末のタスクを他の端末とも同期できます（任意）"
          >
            sync
          </button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
