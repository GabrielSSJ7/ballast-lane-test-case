import { NavLink, useNavigate } from "react-router";
import { BookOpen, LayoutDashboard, LogOut } from "lucide-react";
import { useAuthStore } from "../../entities/user/model/store";
import { apiClient } from "../../shared/api/client";

export function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "librarian" ? "/dashboard/librarian" : "/dashboard/member";

  const handleLogout = async () => {
    try {
      await apiClient.delete("/api/v1/auth/logout");
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
      isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-gray-200 bg-white md:hidden">
      <NavLink to="/books" className={navClass}>
        <BookOpen className="h-5 w-5" />
        Books
      </NavLink>
      <NavLink to={dashboardPath} className={navClass}>
        <LayoutDashboard className="h-5 w-5" />
        Dashboard
      </NavLink>
      <button
        onClick={handleLogout}
        className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
      >
        <LogOut className="h-5 w-5" />
        Sign Out
      </button>
    </nav>
  );
}
