import { useEffect, useState } from "react";
import { Sparkles, Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What payments are coming up soon?",
  "Where can I save money?",
  "How does this month compare to last month?",
  "Which subscription is my biggest recurring cost?",
  "Do I have any overdue bills?",
];

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");

  const ask = async (q) => {
    const question = (q ?? input).trim();
    if (!question || thinking) return;
    setInput("");
    setError("");
    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setThinking(true);
    try {
      const res = await base44.functions.invoke("financeAssistant", { question });
      const d = res.data;
      if (d.error) setError(d.error);
      else setMessages([...next, { role: "assistant", text: d.answer }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-3xl flex-col space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white"><Sparkles className="h-6 w-6 text-indigo-500" /> Ask OnePay</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Answers come from your own bills, subscriptions, payments and expenses — nothing is invented. Forecasts are labelled estimates.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {messages.length === 0 && !thinking && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/20">
              <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Ask anything about your money</p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300"}`}>
              {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "rounded-tr-sm bg-blue-600 text-white" : "rounded-tl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20"><Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-300" /></div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Reading your records…</span>
            </div>
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. What's due next week?"
          disabled={thinking}
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" size="icon" className="shrink-0 bg-indigo-600 hover:bg-indigo-700" disabled={thinking || !input.trim()}>
          {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}