import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios"
import { clearTokens, getTokens, setTokens } from "@/lib/auth"


const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

const refreshClient = axios.create({ baseURL })

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
})


api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getTokens()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})


let refreshPromise: Promise<string | null> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; skipAuthRefresh?: boolean }

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
      refreshPromise ??= refreshClient
        .post("/auth/refresh", { refresh_token: refreshToken }, { skipAuthRefresh: true } as InternalAxiosRequestConfig)
        .then((response) => {
          const { access_token, refresh_token } = response.data as { access_token: string; refresh_token: string }
          setTokens(access_token, refresh_token)
          return access_token
        })
        .finally(() => {
          refreshPromise = null
        })

      const newAccessToken = await refreshPromise
      if (!newAccessToken) {
        throw error
      }

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      clearTokens()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      return Promise.reject(refreshError)
    }
  }
)
