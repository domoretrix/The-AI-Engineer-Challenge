"use client";

import { useCallback, useMemo, useState } from "react";
import { getApiBase } from "@/lib/api";
import { formatApiErrorBody } from "@/lib/httpError";
import { IconClock, IconMapPin, IconThermometer, IconThermometerFeels, IconWind } from "@/components/weather-icons";
import { isWeatherEntity, type WeatherEntity, type WeatherType } from "@/lib/types";

function weatherBgClass(type: WeatherType | null): string {
  if (!type) return "weather-bg weather-bg--default";
  return `weather-bg weather-bg--${type}`;
}

export function WeatherApp() {
  const apiBase = useMemo(() => getApiBase(), []);
  const [apiKey, setApiKey] = useState("");
  const [phase, setPhase] = useState<"welcome" | "chat">("welcome");
  const [message, setMessage] = useState("");
  const [weather, setWeather] = useState<WeatherEntity | null>(null);
  const [chatDocked, setChatDocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitKey = useCallback(async () => {
    setError(null);
    if (!apiKey.trim()) {
      setError("Please paste your API key.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/set-api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ OPENAI_API_KEY: apiKey.trim() }),
      });
      const raw: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(formatApiErrorBody(raw, res.statusText || "Request failed"));
        return;
      }
      setPhase("chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the API. Is the backend running?");
    } finally {
      setBusy(false);
    }
  }, [apiBase, apiKey]);

  const sendChat = useCallback(async () => {
    setError(null);
    const text = message.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const raw: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(formatApiErrorBody(raw, res.statusText || "Request failed"));
        return;
      }
      if (!isWeatherEntity(raw)) {
        setError("Unexpected response from the server.");
        return;
      }
      setWeather(raw);
      setChatDocked(true);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the API.");
    } finally {
      setBusy(false);
    }
  }, [apiBase, message]);

  const onChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendChat();
  };

  const onKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitKey();
  };

  return (
    <div className="relative min-h-dvh text-slate-50">
      <div className={weatherBgClass(weather?.weather_type ?? null)} aria-hidden />

      <div className="relative z-10 flex min-h-dvh flex-col">
        {phase === "welcome" && (
          <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
            <div
              className="w-full max-w-md rounded-2xl border p-8 shadow-2xl backdrop-blur-md"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
              }}
            >
              <h1 className="text-center text-2xl font-semibold tracking-tight text-white">Skyline Weather</h1>
              <p className="mt-3 text-center text-sm leading-relaxed" style={{ color: "var(--card-muted)" }}>
                Welcome. Add your OpenAI API key so we can ask the model about conditions anywhere on Earth. Your key is
                sent only to your FastAPI backend, not stored in this page after refresh.
              </p>
              <form className="mt-8 space-y-4" onSubmit={onKeySubmit}>
                <label className="block text-sm font-medium text-slate-200" htmlFor="api-key">
                  OpenAI API key
                </label>
                <input
                  id="api-key"
                  name="api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-…"
                  className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-slate-100 outline-none ring-2 ring-transparent transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-sky-500/30"
                />
                {error && <p className="text-sm text-rose-300">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Connecting…" : "Save key & continue"}
                </button>
              </form>
              <p className="mt-6 text-center text-xs" style={{ color: "var(--card-muted)" }}>
                Backend URL: <span className="font-mono text-slate-300">{apiBase}</span>
                <br />
                Override with <span className="font-mono">NEXT_PUBLIC_API_BASE</span> in <span className="font-mono">web/.env.local</span>.
              </p>
            </div>
          </main>
        )}

        {phase === "chat" && (
          <>
            {weather && (
              <header className="pointer-events-none z-30 flex flex-col gap-3 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
                <div className="pointer-events-auto mx-auto w-full max-w-3xl opacity-100 transition-opacity duration-500">
                  <div
                    className="rounded-2xl border px-5 py-4 shadow-xl backdrop-blur-md"
                    style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">Summary</p>
                    <p className="mt-2 text-base leading-relaxed text-slate-100">{weather.description}</p>
                  </div>
                </div>

                <div className="pointer-events-auto mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  <WeatherMetricCard kind="location" label="Location" value={weather.location} />
                  <WeatherMetricCard kind="datetime" label="As of" value={weather.weather_date} />
                  <WeatherMetricCard kind="temperature" label="Temperature" value={`${weather.temperature.toFixed(1)}°F`} accent />
                  <WeatherMetricCard kind="feels" label="Feels like" value={`${weather.feels_like.toFixed(1)}°F`} accent />
                  <WeatherMetricCard kind="wind" label="Wind" value={`${weather.wind_speed.toFixed(1)} mph`} />
                </div>
              </header>
            )}

            <div className={`chat-shell ${chatDocked ? "chat-shell--docked" : ""}`}>
              <div
                className="rounded-2xl border p-5 shadow-2xl backdrop-blur-md"
                style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
              >
                <h2 className="text-lg font-semibold text-white">Ask the weather</h2>
                <p className="mt-1 text-xs" style={{ color: "var(--card-muted)" }}>
                  Example: &quot;What&apos;s the weather like in Lisbon tomorrow morning?&quot;
                </p>
                <form className="mt-4 space-y-3" onSubmit={onChatSubmit}>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={chatDocked ? 2 : 4}
                    placeholder="Ask about weather at any location…"
                    className="max-h-48 min-h-[5.5rem] w-full resize-y rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none ring-2 ring-transparent transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-sky-500/30"
                  />
                  {error && <p className="text-sm text-rose-300">{error}</p>}
                  <button
                    type="submit"
                    disabled={busy || !message.trim()}
                    className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "Thinking…" : "Send"}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type MetricKind = "location" | "datetime" | "temperature" | "feels" | "wind";

function WeatherMetricCard({
  kind,
  label,
  value,
  accent,
  className = "",
}: {
  kind: MetricKind;
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  const iconTint =
    kind === "temperature"
      ? "text-amber-300"
      : kind === "feels"
        ? "text-orange-300"
        : kind === "wind"
          ? "text-cyan-300"
          : kind === "location"
            ? "text-emerald-300"
            : "text-violet-300";

  const Icon =
    kind === "location"
      ? IconMapPin
      : kind === "datetime"
        ? IconClock
        : kind === "temperature"
          ? IconThermometer
          : kind === "feels"
            ? IconThermometerFeels
            : IconWind;

  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-md ${accent ? "ring-1 ring-sky-400/35" : ""} ${className}`}
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-white/10 ${iconTint}`}
        aria-hidden
      >
        <Icon className="h-9 w-9" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--card-muted)" }}>
          {label}
        </p>
        <p
          className={`mt-1.5 break-words font-semibold leading-snug text-slate-50 ${accent ? "text-2xl tabular-nums tracking-tight" : "text-sm"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
