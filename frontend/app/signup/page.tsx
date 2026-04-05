"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { isAuthenticated } from "@/lib/auth"

const schema = z
  .object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  React.useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard")
    }
  }, [router])

  const onSubmit = form.handleSubmit(async (values) => {
    setIsPending(true)
    try {
      await api.post("/auth/register", {
        email: values.email,
        password: values.password,
        full_name: values.full_name,
      })

      toast.success("Account created", {
        description: "You can now sign in with your new account.",
      })
      router.replace("/login")
    } catch (error) {
      const message =
        typeof error === "object" && error !== null
          ? ((error as { response?: { data?: { detail?: { message?: string } } } }).response?.data?.detail?.message ?? undefined)
          : undefined
      toast.error("Sign up failed", {
        description: message ?? "Try a different email or check your details.",
      })
    } finally {
      setIsPending(false)
    }
  })

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.22),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(140deg,_#020617,_#0f172a_45%,_#111827)]" />
      <div className="absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl animate-pulse [animation-delay:1.5s]" />

      <Card className="relative w-full max-w-md border-slate-800 bg-slate-900/90 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="font-mono text-2xl font-semibold tracking-tight">FinanceDash</div>
          <CardTitle>Create account</CardTitle>
          <CardDescription className="text-slate-400">Open your personal finance workspace in under a minute.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" className="border-slate-700 bg-slate-950 text-white" {...form.register("full_name")} />
              {form.formState.errors.full_name ? <p className="text-sm text-rose-400">{form.formState.errors.full_name.message}</p> : null}
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" className="border-slate-700 bg-slate-950 text-white" {...form.register("confirmPassword")} />
              {form.formState.errors.confirmPassword ? <p className="text-sm text-rose-400">{form.formState.errors.confirmPassword.message}</p> : null}
            </div>
            <Button className="w-full bg-teal-500 text-slate-950 hover:bg-teal-400" disabled={isPending} type="submit">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending ? "Creating account" : "Create account"}
            </Button>
            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-teal-300 underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
