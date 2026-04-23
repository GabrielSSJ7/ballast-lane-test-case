import { Link } from "react-router";
import { RegisterForm } from "../../features/auth-register/ui/RegisterForm";
import { Card, CardContent, CardHeader } from "../../shared/ui/Card";

export function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">📚 Library</h1>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Register</h2>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
