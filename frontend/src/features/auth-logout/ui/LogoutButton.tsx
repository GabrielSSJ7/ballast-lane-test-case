import { useNavigate } from "react-router";
import { useAuthStore } from "../../../entities/user/model/store";
import { apiClient } from "../../../shared/api/client";
import { Button } from "../../../shared/ui/Button";

export function LogoutButton() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = async () => {
    try {
      await apiClient.delete("/api/v1/auth/logout");
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      Sign Out
    </Button>
  );
}
