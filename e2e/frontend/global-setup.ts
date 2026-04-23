import fs from "fs";
import path from "path";

const API_BASE = "http://localhost:3001";
const AUTH_DIR = path.join(__dirname, "playwright/.auth");
const FRONTEND_ORIGIN = "http://localhost:5174";

interface UserCredentials {
  email: string;
  password: string;
}

interface StorageStateFile {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

async function loginAndGetAuth(credentials: UserCredentials): Promise<{
  token: string;
  user: { id: number; name: string; email: string; role: string };
}> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: credentials }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed for ${credentials.email}: ${res.status} ${body}`);
  }

  const authHeader = res.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const user = await res.json();

  return { token, user };
}

function buildStorageState(
  token: string,
  user: { id: number; name: string; email: string; role: string }
): StorageStateFile {
  // Keep token in localStorage so borrowings.spec.ts readToken() still works.
  // Zustand's partialize only persists user, so the token in localStorage is
  // an artifact for tests — the app uses the httpOnly cookie for auth.
  const authValue = JSON.stringify({
    state: { token, user },
    version: 0,
  });

  const expiresEpoch = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  return {
    cookies: [
      {
        name: "auth_token",
        value: token,
        domain: "localhost",
        path: "/",
        expires: expiresEpoch,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ],
    origins: [
      {
        origin: FRONTEND_ORIGIN,
        localStorage: [{ name: "auth", value: authValue }],
      },
    ],
  };
}

async function saveAuthState(
  credentials: UserCredentials,
  filename: string
): Promise<void> {
  const { token, user } = await loginAndGetAuth(credentials);
  const state = buildStorageState(token, user);
  const filePath = path.join(AUTH_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  console.log(`Saved auth state for ${credentials.email} → ${filePath}`);
}

async function globalSetup(): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  await saveAuthState(
    { email: "e2e_librarian@library.com", password: "password123" },
    "librarian.json"
  );

  await saveAuthState(
    { email: "e2e_member1@library.com", password: "password123" },
    "member.json"
  );

  await saveAuthState(
    { email: "e2e_member2@library.com", password: "password123" },
    "member2.json"
  );
}

export default globalSetup;
