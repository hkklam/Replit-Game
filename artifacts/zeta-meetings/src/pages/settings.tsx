import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import type { Settings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, Globe, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

const PROVIDERS = [
  {
    id: "whisper" as const,
    name: "OpenAI Whisper",
    cost: "$0.006 / min",
    description: "Default. Uses Replit AI integration — no API key needed. GPT-4o used for speaker detection.",
    needsKey: false,
    keyLink: null,
    keyPlaceholder: "",
  },
  {
    id: "deepgram" as const,
    name: "Deepgram Nova-2",
    cost: "$0.0043 / min",
    description: "Cheapest option. Fastest transcription. Built-in speaker detection — no extra GPT-4o call.",
    needsKey: true,
    keyLink: "https://console.deepgram.com",
    keyPlaceholder: "dg_xxxxxxxxxxxxxxxx",
  },
  {
    id: "assemblyai" as const,
    name: "AssemblyAI",
    cost: "$0.0065 / min",
    description: "High accuracy. Built-in speaker detection. Async processing (slightly slower).",
    needsKey: true,
    keyLink: "https://www.assemblyai.com/app/account",
    keyPlaceholder: "your-assemblyai-api-key",
  },
] as const;

const LANGUAGES = [
  { value: "", label: "Auto-detect" },
  { value: "zh", label: "Mandarin Chinese" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Brazilian Portuguese" },
  { value: "sv", label: "Swedish" },
];

const DEFAULTS: Settings = {
  transcriptionProvider: "whisper",
  transcriptionApiKey: null,
  translationEnabled: false,
  translationApiKey: null,
  translationLanguageHint: null,
};

export default function SettingsPage() {
  const { data: saved, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const { toast } = useToast();

  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [showTransKey, setShowTransKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (saved) {
      setForm(saved);
      setDirty(false);
    }
  }, [saved]);

  function patch(updates: Partial<Settings>) {
    setForm((f) => ({ ...f, ...updates }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ data: form });
      toast({ title: "Settings saved" });
      setDirty(false);
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </Layout>
    );
  }

  const selectedProvider = PROVIDERS.find((p) => p.id === form.transcriptionProvider) ?? PROVIDERS[0];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure transcription and translation services.</p>
        </div>

        {/* Transcription */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 font-semibold text-base">
              <Mic className="h-4 w-4 text-primary" /> Transcription Service
            </div>

            <div className="space-y-3">
              {PROVIDERS.map((p) => {
                const selected = form.transcriptionProvider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => patch({ transcriptionProvider: p.id })}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                          {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.description}</div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-primary whitespace-nowrap mt-0.5">{p.cost}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedProvider.needsKey && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {selectedProvider.name} API Key
                  </label>
                  {selectedProvider.keyLink && (
                    <a
                      href={selectedProvider.keyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      Get API key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showTransKey ? "text" : "password"}
                    placeholder={selectedProvider.keyPlaceholder}
                    value={form.transcriptionApiKey ?? ""}
                    onChange={(e) => patch({ transcriptionApiKey: e.target.value || null })}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTransKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTransKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.transcriptionApiKey && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> API key saved
                  </p>
                )}
                {!form.transcriptionApiKey && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> API key required to use this provider
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Translation */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 font-semibold text-base">
              <Globe className="h-4 w-4 text-primary" /> Translation
            </div>

            <div className="flex items-start gap-3">
              <button
                role="switch"
                aria-checked={form.translationEnabled}
                onClick={() => patch({ translationEnabled: !form.translationEnabled })}
                className={`relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                  form.translationEnabled ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.translationEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <div>
                <div className="text-sm font-medium">Translate non-English meetings to English</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Uses Google Cloud Translation. Free up to 500,000 characters/month (~55–70 meetings). Both the original and translated transcripts are saved.
                </div>
              </div>
            </div>

            {form.translationEnabled && (
              <div className="space-y-4 pt-1 border-t border-border">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language Hint</label>
                  <select
                    value={form.translationLanguageHint ?? ""}
                    onChange={(e) => patch({ translationLanguageHint: e.target.value || null })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    A language hint improves translation accuracy for short meeting snippets.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Google Translate API Key</label>
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      Get API key <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <Input
                      type={showGoogleKey ? "text" : "password"}
                      placeholder="AIzaSy..."
                      value={form.translationApiKey ?? ""}
                      onChange={(e) => patch({ translationApiKey: e.target.value || null })}
                      className="pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGoogleKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.translationApiKey ? (
                    <p className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> API key saved
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Required to enable translation
                    </p>
                  )}
                  <div className="bg-secondary/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">How to get a free Google Translate API key:</p>
                    <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
                      <li>Go to console.cloud.google.com → create a project</li>
                      <li>Enable the Cloud Translation API</li>
                      <li>APIs & Services → Credentials → Create API Key</li>
                      <li>Restrict key to Cloud Translation API only</li>
                    </ol>
                    <p className="mt-1">Free tier: 500K chars/month — no billing unless exceeded.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
            className="min-w-24"
          >
            {updateMutation.isPending ? "Saving…" : "Save Settings"}
          </Button>
          {!dirty && saved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Up to date
            </span>
          )}
        </div>
      </div>
    </Layout>
  );
}
