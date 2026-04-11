export const publicRoutes: string[] = ["/", "/about"];

// Path prefixes that guests may browse without signing in
export const publicPrefixes: string[] = ["/listings", "/browse", "/u/"];

export const authRoutes: string[] = ["/signin", "/signup", "/forgot-password"];

export const apiAuthPrefix: string = "/api/auth";

export const DEFAULT_LOGIN_REDIRECT: string = "/";
