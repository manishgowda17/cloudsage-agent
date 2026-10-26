import { createClient } from "@insforge/sdk";
import { InvestigationHistoryItem } from "@/types";

const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || "https://mucsd7yw.us-east.insforge.app";
const INSFORGE_ANON_KEY =
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
  "anon_57cbe317689f3e724ced0051c10d088eab9ddc1123ce564702735a7dcb764eb8";

// Initialize InsForge SDK client
export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

export const insforgeService = {
  // --- Auth API ---
  async signIn(email: string, password: string) {
    const res = await insforge.auth.signInWithPassword({ email, password });
    if (res.data?.accessToken && typeof window !== "undefined") {
      localStorage.setItem("insforge_access_token", res.data.accessToken);
    }
    return res;
  },

  async signUp(email: string, password: string, name?: string) {
    const res = await insforge.auth.signUp({
      email,
      password,
      name: name || email.split("@")[0],
    });
    if ((res.data as any)?.accessToken && typeof window !== "undefined") {
      localStorage.setItem("insforge_access_token", (res.data as any).accessToken);
    }
    return res;
  },

  async signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("insforge_access_token");
    }
    return await insforge.auth.signOut();
  },

  async getCurrentUser() {
    return await insforge.auth.getCurrentUser();
  },

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const fromSdk = (insforge as any).tokenManager?.getAccessToken();
      if (fromSdk) return fromSdk;
    } catch {
      // Ignore SDK inspection error
    }
    return localStorage.getItem("insforge_access_token");
  },

  // --- Investigations Database API ---
  async saveInvestigation(item: Omit<InvestigationHistoryItem, "id" | "created_at"> & { user_id?: string }) {
    try {
      const record = {
        root_cause: item.root_cause,
        explanation: item.explanation || "",
        suggested_fix: item.suggested_fix || "",
        kubectl_command: item.kubectl_command || "",
        namespace: item.namespace || "default",
        confidence: item.confidence || 90,
        status: item.status || "completed",
        user_id: item.user_id || null,
        created_at: new Date().toISOString(),
      };

      // InsForge SDK insert requires array format: [{ ... }]
      const { data, error } = await insforge.database
        .from("investigations")
        .insert([record])
        .select();

      if (error) {
        console.warn("InsForge DB insert error (saving to local cache):", error);
        this._saveLocalHistory(record);
      }
      return { data, error };
    } catch (err) {
      console.warn("Failed to persist investigation in InsForge:", err);
      return { data: null, error: err };
    }
  },

  async getRecentInvestigations(): Promise<InvestigationHistoryItem[]> {
    try {
      const { data, error } = await insforge.database
        .from("investigations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) {
        return this._getLocalHistory();
      }

      return data as InvestigationHistoryItem[];
    } catch (err) {
      console.warn("Falling back to local cached history:", err);
      return this._getLocalHistory();
    }
  },

  // Local fallback persistence for demo resilience
  _getLocalHistory(): InvestigationHistoryItem[] {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("k8s_investigations_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  _saveLocalHistory(record: any) {
    if (typeof window === "undefined") return;
    try {
      const current = this._getLocalHistory();
      const updated = [record, ...current].slice(0, 15);
      localStorage.setItem("k8s_investigations_history", JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  },

  // --- Realtime API ---
  async subscribeRealtime(channel: string = "k8s-investigation-progress", onEvent?: (data: any) => void) {
    try {
      await insforge.realtime.connect();
      await insforge.realtime.subscribe(channel);
      if (onEvent) {
        insforge.realtime.on("progress", onEvent);
      }
    } catch (err) {
      console.warn("InsForge Realtime connection skipped:", err);
    }
  },
};
