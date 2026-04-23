import { Link } from "react-router";
import { LoginForm } from "../../features/auth-login/ui/LoginForm";
import { Card, CardContent, CardHeader } from "../../shared/ui/Card";

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">📚 Library</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <p className="mt-4 text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Register
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-gray-500">
          Demo: librarian@library.com / password123
        </p>
      </div>
    </div>
  );
}
