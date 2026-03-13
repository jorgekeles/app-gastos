import { AuthPanel } from "@/components/auth/auth-panel";

export default function LoginPage() {
  return (
    <main className="app-shell">
      <div className="auth-shell">
        <AuthPanel mode="login" />
      </div>
    </main>
  );
}
