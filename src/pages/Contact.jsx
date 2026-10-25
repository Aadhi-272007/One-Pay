import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, CheckCircle2, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSending(true);
    setError("");
    try {
      await base44.entities.ContactMessage.create({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong — please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to OnePay
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Contact us</h1>
        <p className="mt-3 text-[15px] text-slate-600 dark:text-slate-300">
          Questions, feedback or a problem with your account? Send us a message and the OnePay team will get back to you.
        </p>

        {sent ? (
          <div className="mt-8 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-300">Message sent</p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">Thanks for reaching out — we read every message and will reply soon.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Your name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Sharma" required />
              </div>
              <div className="space-y-1.5">
                <Label>Your email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={5} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="How can we help?" required />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" disabled={sending} className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto">
              {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}