"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { Sidebar } from "@/components/layout/Sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { isAuthenticated } from "@/lib/auth"
import type { User } from "@/types"


function LoadingShell() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="w-60 border-r border-slate-200 bg-slate-950" />
      <div className="flex-1 p-8">
        <Skeleton className="h-12 w-56 rounded-2xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: currentUser, isLoading, isError } = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await api.get<User>("/auth/me")
      return response.data
    },
    enabled: isAuthenticated(),
    retry: false,
  })

  React.useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
    }
  }, [router])

  if (isLoading || !currentUser) {
    return <LoadingShell />
  }

  if (isError) {
    return <LoadingShell />
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-950">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 overflow-y-auto bg-slate-100 p-6 lg:p-8">{children}</main>
    </div>
  )
}
