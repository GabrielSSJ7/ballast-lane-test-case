import { createBrowserRouter, redirect } from "react-router";
import { useAuthStore } from "../entities/user/model/store";

function requireAuth() {
  const user = useAuthStore.getState().user;
  if (!user) return redirect("/login");
  return null;
}

function requireLibrarian() {
  const { user } = useAuthStore.getState();
  if (!user) return redirect("/login");
  if (user.role !== "librarian") return redirect("/dashboard/member");
  return null;
}

function requireMember() {
  const { user } = useAuthStore.getState();
  if (!user) return redirect("/login");
  if (user.role !== "member") return redirect("/dashboard/librarian");
  return null;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    loader: () => {
      const { user } = useAuthStore.getState();
      if (user) return redirect(user.role === "librarian" ? "/dashboard/librarian" : "/dashboard/member");
      return null;
    },
    lazy: () =>
      import("../pages/login/LoginPage").then((m) => ({ Component: m.LoginPage })),
  },
  {
    path: "/register",
    lazy: () =>
      import("../pages/register/RegisterPage").then((m) => ({ Component: m.RegisterPage })),
  },
  {
    path: "/",
    loader: requireAuth,
    lazy: () =>
      import("../pages/layout/Layout").then((m) => ({ Component: m.Layout })),
    children: [
      {
        index: true,
        loader: () => {
          const role = useAuthStore.getState().user?.role;
          return redirect(
            role === "librarian" ? "/dashboard/librarian" : "/dashboard/member"
          );
        },
      },
      {
        path: "books",
        lazy: () =>
          import("../pages/books-list/BooksListPage").then((m) => ({
            Component: m.BooksListPage,
          })),
      },
      {
        path: "books/new",
        loader: requireLibrarian,
        lazy: () =>
          import("../pages/book-edit/BookEditPage").then((m) => ({
            Component: m.BookEditPage,
          })),
      },
      {
        path: "books/:id/edit",
        loader: requireLibrarian,
        lazy: () =>
          import("../pages/book-edit/BookEditPage").then((m) => ({
            Component: m.BookEditPage,
          })),
      },
      {
        path: "dashboard/librarian",
        loader: requireLibrarian,
        lazy: () =>
          import("../pages/dashboard-librarian/DashboardLibrarianPage").then((m) => ({
            Component: m.DashboardLibrarianPage,
          })),
      },
      {
        path: "dashboard/member",
        loader: requireMember,
        lazy: () =>
          import("../pages/dashboard-member/DashboardMemberPage").then((m) => ({
            Component: m.DashboardMemberPage,
          })),
      },
    ],
  },
  {
    path: "*",
    loader: () => redirect("/"),
  },
]);
