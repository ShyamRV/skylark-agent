import NextAuth from "next-auth";
import { getAuthOptions } from "@/platform/auth/options";

const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };
