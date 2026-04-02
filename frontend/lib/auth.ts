import Cookies from "js-cookie"


const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"


export function getTokens() {
  return {
    accessToken: Cookies.get(ACCESS_TOKEN_KEY) ?? null,
    refreshToken: Cookies.get(REFRESH_TOKEN_KEY) ?? null,
  }
}


export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, { sameSite: "strict" })
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { sameSite: "strict" })
}


export function clearTokens() {
  Cookies.remove(ACCESS_TOKEN_KEY)
  Cookies.remove(REFRESH_TOKEN_KEY)
}


export function isAuthenticated() {
  return Boolean(Cookies.get(ACCESS_TOKEN_KEY))
}
