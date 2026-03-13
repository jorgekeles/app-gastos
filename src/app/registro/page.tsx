import { AuthPanel } from "@/components/auth/auth-panel";

export default function RegisterPage() {
  return (
    <main className="app-shell">
      <div className="auth-shell">
        <AuthPanel mode="register" />
      </div>
    </main>
  );
}
