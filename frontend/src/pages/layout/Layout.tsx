import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router";
import { useAuthStore } from "../../entities/user/model/store";
import { LogoutButton } from "../../features/auth-logout/ui/LogoutButton";
import { BottomNav } from "./BottomNav";
import { apiClient, ApiError } from "../../shared/api/client";
import type { User } from "../../entities/user/model/types";

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get<User>("/api/v1/users/me")
      .then((freshUser) => setUser(freshUser))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearAuth();
          navigate("/login");
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              📚 Library
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/books"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Books
              </Link>
              {user?.role === "librarian" && (
                <Link
                  to="/dashboard/librarian"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
              )}
              {user?.role === "member" && (
                <Link
                  to="/dashboard/member"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 md:block">
              {user?.name} ({user?.role})
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 md:pb-6 lg:px-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
