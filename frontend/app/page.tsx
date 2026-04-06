import Link from "next/link"
import { ArrowRight, BarChart3, ShieldCheck, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const highlights = [
  {
    icon: Wallet,
    title: "Real-time transaction control",
    description: "Track inflow and outflow with category-level clarity and export-ready records.",
  },
  {
    icon: BarChart3,
    title: "Actionable analytics",
    description: "See trends, category distribution, and recent movements in one operator-friendly dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based governance",
    description: "Separate responsibilities for Admin, Analyst, and Viewer access with safer controls.",
  },
]

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(16,185,129,0.25),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.2),transparent_35%),linear-gradient(145deg,#020617,#0b1220_48%,#111827)]" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-10 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="font-mono text-xl font-semibold tracking-tight">FinanceDash</div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">Create account</Button>
            </Link>
          </div>
        </header>

        <div className="mt-20 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
              Terminal-grade financial operations
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
              Operate your finances with the precision of a control plane.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
              FinanceDash gives teams a clean, role-aware workspace for transactions, analytics, and governance. Built for decisions, not spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/login">
                <Button className="h-11 bg-emerald-500 px-6 text-slate-950 hover:bg-emerald-400">
                  Launch dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup" className="text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline">
                New here? Start with a free account
              </Link>
            </div>
          </div>

          <Card className="border-slate-700 bg-slate-900/70 text-slate-100 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-slate-100">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                <div className="text-xs text-slate-400">Net Position</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-300">+ INR 2,40,750</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                <div className="text-xs text-slate-400">This month spend</div>
                <div className="mt-1 text-2xl font-semibold text-rose-300">INR 84,320</div>
              </div>
              <div className="text-xs text-slate-400">Sample panel for preview. Real values appear after sign in.</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.title} className="border-slate-700 bg-slate-900/70 text-slate-100 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base text-slate-100">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-300">{item.description}</CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}
