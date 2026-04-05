"use client"

import * as React from "react"
import Link from "next/link"
import { AxiosError } from "axios"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { isAuthenticated, setTokens } from "@/lib/auth"
import type { UserRole } from "@/types"


const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormValues = z.infer<typeof schema>

const roleRedirect: Record<UserRole, string> = {
  ADMIN: "/users",
  ANALYST: "/transactions",
  VIEWER: "/dashboard",
}

export default function LoginPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  React.useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard")
    }
  }, [router])

  const onSubmit = form.handleSubmit(async (values) => {
    setIsPending(true)
    try {
      const response = await api.post("/auth/login", values)
      const { access_token, refresh_token, user } = response.data
      setTokens(access_token, refresh_token)
      queryClient.setQueryData(["current-user"], user)
      router.replace(roleRedirect[user.role as UserRole] ?? "/dashboard")
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.detail?.message as string | undefined)
          : undefined
      toast.error("Login failed", {
        description: message ?? "Check your credentials and try again.",
      })
    } finally {
      setIsPending(false)
    }
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)]" />
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl animate-pulse [animation-delay:1.5s]" />

      <Card className="relative w-full max-w-md border-slate-800 bg-slate-900/90 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="font-mono text-2xl font-semibold tracking-tight">FinanceDash</div>
          <CardTitle>Sign in</CardTitle>
          <CardDescription className="text-slate-400">Access the financial control plane with your corporate credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="border-slate-700 bg-slate-950 text-white" {...form.register("email")} />
              {form.formState.errors.email ? <p className="text-sm text-rose-400">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" className="border-slate-700 bg-slate-950 text-white" {...form.register("password")} />
              {form.formState.errors.password ? <p className="text-sm text-rose-400">{form.formState.errors.password.message}</p> : null}
            </div>
            <Button className="w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400" disabled={isPending} type="submit">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? "Signing in" : "Sign in"}
            </Button>

            <div className="mt-6 space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Demo Credentials</p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-slate-400">Admin</p>
                  <p className="font-mono text-slate-300">admin@example.com / Password123</p>
                </div>
                <div>
                  <p className="text-slate-400">Analyst</p>
                  <p className="font-mono text-slate-300">analyst@example.com / Password123</p>
                </div>
                <div>
                  <p className="text-slate-400">Viewer</p>
                  <p className="font-mono text-slate-300">viewer@example.com / Password123</p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-slate-400">
              New here?{" "}
              <Link href="/signup" className="text-emerald-300 underline-offset-4 hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
