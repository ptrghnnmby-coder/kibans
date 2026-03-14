import { getServerSession, AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { USER_MAP } from '@/lib/sheets-types'
import { logDebug } from '@/lib/debug-logger'

export const getAuthSession = () => getServerSession(authOptions)

export const authOptions: AuthOptions = {
    useSecureCookies: process.env.NODE_ENV === 'production',
    session: {
        strategy: "jwt",
        maxAge: 8 * 60 * 60, // 8 hours — expires at end of work day
    },
    providers: [
        CredentialsProvider({
            id: 'demo',
            name: 'Demo Mode',
            credentials: {},
            async authorize(credentials, req) {
                return {
                    id: 'demo-user-id',
                    email: 'demo@southmarinetrading.com',
                    name: 'Demo User',
                    role: 'Admin',
                    isDemo: true
                } as any;
            }
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            return true
        },
        async jwt({ token, user, account, profile, trigger }) {
            if (user) {
                console.log('[Auth] JWT Callback - User data found:', { id: user.id, email: user.email, role: (user as any).role })
                logDebug('JWT Callback', { event: 'user_present', userId: user.id, email: user.email, role: (user as any).role })
                token.role = (user as any).role
                token.id = (user as any).id
                if ((user as any).isDemo) {
                    token.isDemo = true
                }
            } else {
                // Periodical check or session refresh
                // console.log('[Auth] JWT Callback - Periodical refresh')
            }
            return token
        },
        async session({ session, token, user }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
                if (token.isDemo) {
                    (session.user as any).isDemo = true;
                }
                console.log('[Auth] Session Callback - Session active for:', session.user.email)
                logDebug('Session Callback', { event: 'session_active', email: session.user.email, role: token.role })
            } else {
                console.warn('[Auth] Session Callback - No user in session')
                logDebug('Session Callback', { event: 'no_user_in_session' })
            }
            return session
        }
    },
    debug: process.env.NODE_ENV !== 'production',
    secret: process.env.NEXTAUTH_SECRET,
}
