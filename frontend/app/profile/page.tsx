"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import type { User } from "@/types"


const schema = z.object({
  old_password: z.string().min(8),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8),
}).refine((values) => values.new_password === values.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
})

type FormValues = z.infer<typeof schema>


export default function ProfilePage() {
  const currentUserQuery = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => (await api.get("/auth/me")).data,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { old_password: "", new_password: "", confirm_password: "" },
  })

  const changePassword = useMutation({
    mutationFn: async (values: FormValues) => api.post("/users/me/change-password", { old_password: values.old_password, new_password: values.new_password }),
    onSuccess: () => {
      toast.success("Password updated")
      form.reset()
    },
    onError: () => toast.error("Unable to update password"),
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Review your account details and update your password.</p>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
          <CardContent>
            {currentUserQuery.isLoading ? (
              <Skeleton className="h-28 rounded-2xl" />
            ) : currentUserQuery.data ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-slate-500">Name</div>
                  <div className="font-medium text-slate-950">{currentUserQuery.data.full_name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Email</div>
                  <div className="font-medium text-slate-950">{currentUserQuery.data.email}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Role</div>
                  <div className="font-medium text-slate-950">{currentUserQuery.data.role}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Created</div>
                  <div className="font-medium text-slate-950">{new Date(currentUserQuery.data.created_at).toLocaleDateString("en-GB")}</div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => changePassword.mutate(values))}>
              <div className="space-y-2">
                <Label htmlFor="old_password">Current password</Label>
                <Input id="old_password" type="password" {...form.register("old_password")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input id="new_password" type="password" {...form.register("new_password")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input id="confirm_password" type="password" {...form.register("confirm_password")} />
                {form.formState.errors.confirm_password ? <p className="text-sm text-rose-600">{form.formState.errors.confirm_password.message}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Update password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
