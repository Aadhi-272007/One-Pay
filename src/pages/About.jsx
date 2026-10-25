import { Link } from "react-router-dom";
import { Wallet, ArrowLeft } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to OnePay
        </Link>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase">About OnePay</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">One payment hub for every bill, renewal and reminder</h1>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            OnePay is a personal payments hub that brings every recurring commitment in your financial life into one calm, organized place. It tracks bills, subscriptions, AutoPay mandates and one-off expenses side by side, so you always know what is due, when it is due, and how much of your monthly budget it consumes. Each entry carries its own amount, currency, billing cycle and due date, and OnePay turns that data into clear, useful views: a dashboard of upcoming payments, a calendar of renewals, analytics of where your money actually goes, and a full history of everything you have paid.
          </p>
          <p>
            Beyond tracking, OnePay actively helps you act. It can scan a photo or PDF of an invoice and read out the provider, amount and due date automatically, surface bill notices from your connected email as reviewable suggestions, send reminder emails before due dates, and take you straight to the official website or app of a provider when it is time to pay. Every action is informational — OnePay reminds, organizes and points you to official sources, but never debits money on its own.
          </p>
          <p>
            It is built for individuals and households who juggle many providers — utilities, telecom, internet, insurance, EMI schedules and streaming subscriptions — and want one trustworthy place to manage them all, with their data kept strictly private to their own account. OnePay is designed and built by the OnePay team with a focus on clarity, security and a premium, uncluttered experience.
          </p>
        </div>
      </div>
    </div>
  );
}