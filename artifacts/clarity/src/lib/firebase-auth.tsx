import { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

interface FirebaseAuthContextValue {
  user: User | null;
  isReady: boolean;
  isConfigured: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

function authErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "auth/popup-blocked") return "Your browser blocked the Google sign-in window. Allow pop-ups and try again.";
  if (code === "auth/popup-closed-by-user") return "The Google sign-in window was closed before finishing.";
  if (code === "auth/unauthorized-domain") return "This website is not registered as an authorized Firebase domain yet.";
  return "Google sign-in did not complete. Please try again.";
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(!isFirebaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsReady(true);
    });
  }, []);

  async function signIn(): Promise<void> {
    if (!auth) return;
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (signInError) {
      setError(authErrorMessage(signInError));
      throw signInError;
    }
  }

  async function signOutUser(): Promise<void> {
    if (auth) await signOut(auth);
  }

  return (
    <FirebaseAuthContext.Provider value={{
      user,
      isReady,
      isConfigured: isFirebaseConfigured,
      error,
      signIn,
      signOutUser,
    }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth(): FirebaseAuthContextValue {
  const context = useContext(FirebaseAuthContext);
  if (!context) throw new Error("useFirebaseAuth must be used inside FirebaseAuthProvider");
  return context;
}

function SignInScreen() {
  const { error, signIn } = useFirebaseAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signIn();
    } catch {
      // The provider exposes a user-friendly message.
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">✦</div>
        <h1 className="text-3xl font-display font-bold text-foreground">Welcome to Clarity</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in with Google to keep your tasks synced across your devices.</p>
        <button
          onClick={() => void handleSignIn()}
          disabled={loading}
          className="mt-7 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Opening Google…" : "Continue with Google"}
        </button>
        {error && <p className="mt-4 text-left text-xs leading-5 text-destructive">{error}</p>}
      </section>
    </main>
  );
}

export function FirebaseAuthGate({ children }: { children: React.ReactNode }) {
  const { isReady, isConfigured, user } = useFirebaseAuth();
  if (!isConfigured) {
    return <SignInScreen />;
  }
  if (!isReady) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Loading Clarity…</div>;
  }
  return user ? <>{children}</> : <SignInScreen />;
}
