import NextAuth, { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    access_token?: string;
  }

  interface JWT extends DefaultJWT {
    access_token?: string;
  }
}
