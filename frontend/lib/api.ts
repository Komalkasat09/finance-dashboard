import axios from "axios"
import { clearTokens, getTokens, setTokens } from "@/lib/auth"


const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

const refreshClient = axios.create({ baseURL })

export const api = axios.create({
  baseURL,
  withCredentials: true,
})


api.interceptors.request.use((config) => {
  const { accessToken } = getTokens()
  if (accessToken) {
    config.headers = config.headers ?? {}
    ;(config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`
  }
  return config
})


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error?.config ?? {}) as { headers?: Record<string, string>; _retry?: boolean; skipAuthRefresh?: boolean }

    if (error.response?.status !== 401 || originalRequest?._retry || originalRequest?.skipAuthRefresh) {
      return Promise.reject(error)
    }

    const { refreshToken } = getTokens()
    if (!refreshToken) {
      clearTokens()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const refreshResponse = await refreshClient.post("/auth/refresh", { refresh_token: refreshToken })
      const { access_token, refresh_token } = refreshResponse.data as { access_token: string; refresh_token: string }
      setTokens(access_token, refresh_token)

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${access_token}`
      return api(originalRequest as any)
    } catch (refreshError) {
      clearTokens()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      return Promise.reject(refreshError)
    }
  }
)
