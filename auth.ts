import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { clientIp, loginWithBackend } from "@/lib/auth/backend";
import { loginSchema } from "@/lib/schemas/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const s = await loginWithBackend(parsed.data.email, parsed.data.password, clientIp(request.headers));
        if (!s) return null;
        return {
          id: s.user.id, name: s.user.name, email: s.user.email, role: s.user.role,
          accessToken: s.accessToken, refreshToken: s.refreshToken, accessExpires: s.accessExpires,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Simpan token backend di JWT terenkripsi. `session` (authConfig) sengaja tidak menyalinnya ke klien.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessExpires = user.accessExpires;
      }
      return token;
    },
  },
});
