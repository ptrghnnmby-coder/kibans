import { withAuth } from "next-auth/middleware"

export default withAuth(
    function middleware(req) {
        console.log('Middleware processing request:', req.nextUrl.pathname)
        // console.log('Middleware Token:', req.nextauth.token) // Verbose
    },
    {
        callbacks: {
            authorized: ({ token }) => {
                console.log('Middleware Authorized Check. Token exists:', !!token)
                if (!token) console.log('Middleware rejection: No token found')
                return !!token
            },
        },
    }
)

export const config = {
    // Proteger todas las rutas excepto login, api/auth y endpoints de tracking público
    matcher: [
        "/((?!api/auth|api/whatsapp|api/tracking/refresh-all|api/tracking/cache-list|login|_next/static|_next/image|favicon.ico).*)",
    ],
}

