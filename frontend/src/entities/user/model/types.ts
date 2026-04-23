export type Role = "member" | "librarian";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}
