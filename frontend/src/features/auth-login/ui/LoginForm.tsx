import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { loginSchema, type LoginFormData } from "../model/schema";
import { useAuthStore } from "../../../entities/user/model/store";
import { API_URL } from "../../../shared/config/env";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";

export function LoginForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user: data }),
      });

      if (!res.ok) {
        setError("root", { message: "Invalid email or password" });
        return;
      }

      const authHeader = res.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const user = await res.json();
      setAuth(token, user);
      navigate(user.role === "librarian" ? "/dashboard/librarian" : "/dashboard/member");
    } catch {
      setError("root", { message: "Network error. Please try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        type="password"
        error={errors.password?.message}
        {...register("password")}
      />
      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}
      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
