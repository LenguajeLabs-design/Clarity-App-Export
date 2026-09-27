import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, type User } from "firebase/auth";
import { auth, googleClientIds, isFirebaseConfigured } from "./firebase";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  isConfigured: boolean;
  error: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

  return <AuthContext.Provider value={{ user, isReady, isConfigured: isFirebaseConfigured, error }}>{children}</AuthContext.Provider>;
}

export function useFirebaseAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useFirebaseAuth must be used inside FirebaseAuthProvider");
  return context;
}

function SignInButton() {
  const colors = useColors();
  const { isConfigured } = useFirebaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleClientIds.web,
    iosClientId: googleClientIds.ios,
    androidClientId: googleClientIds.android,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    async function completeSignIn() {
      if (!auth || response?.type !== "success") return;
      const idToken = response.params?.id_token;
      const accessToken = response.authentication?.accessToken;
      if (!idToken && !accessToken) return;
      setLoading(true);
      setError("");
      try {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(auth, credential);
      } catch {
        setError("Google sign-in did not complete. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    void completeSignIn();
  }, [response]);

  async function signIn() {
    if (!auth || !request) return;
    setLoading(true);
    setError("");
    try {
      if (Platform.OS === "web") {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } else {
        await promptAsync();
      }
    } catch {
      setLoading(false);
      setError("Google sign-in did not complete. Please try again.");
    }
  }

  if (!isConfigured) return <Text style={{ color: colors.destructive, textAlign: "center" }}>Firebase is not configured yet.</Text>;

  return (
    <View style={{ width: "100%", gap: 12 }}>
      <TouchableOpacity
        onPress={() => void signIn()}
        disabled={!request || loading}
        style={{ minHeight: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, opacity: !request || loading ? 0.6 : 1 }}
      >
        {loading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Continue with Google</Text>}
      </TouchableOpacity>
      {error ? <Text style={{ color: colors.destructive, fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
    </View>
  );
}

export function FirebaseAuthGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { isReady, isConfigured, user } = useFirebaseAuth();
  if (!isConfigured) {
    return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 28 }}><Text style={{ color: colors.foreground, textAlign: "center", fontSize: 18, fontFamily: "Inter_600SemiBold" }}>Firebase setup is still needed.</Text></View>;
  }
  if (!isReady) return <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View>;
  if (user) return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 28 }}>
      <View style={{ width: "100%", maxWidth: 380, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 24, gap: 14 }}>
        <Text style={{ color: colors.foreground, fontSize: 28, fontFamily: "Inter_700Bold" }}>Welcome to Clarity</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 20 }}>Sign in with Google to keep your tasks synced across your devices.</Text>
        <SignInButton />
      </View>
    </View>
  );
}
