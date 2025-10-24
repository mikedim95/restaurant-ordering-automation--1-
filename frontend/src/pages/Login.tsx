import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { HomeLink } from "@/components/HomeLink";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const debugEnabled = String((import.meta as any).env?.VITE_ENABLE_DEBUG_LOGIN || "").toLowerCase() === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { accessToken, user } = await api.signIn(email, password);
      login(user, accessToken);
      if (user.role === "manager") navigate("/manager");
      else if (user.role === "cook") navigate("/cook");
      else navigate("/waiter");
    } catch (err: any) {
      alert(err?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <HomeLink />
      </div>
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {t("auth.login")}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("auth.email")}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="waiter1@demo.local"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("auth.password")}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="changeme"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {t("auth.sign_in")}
          </Button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          Demo: waiter1@demo.local / manager@demo.local
        </p>

        {debugEnabled && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-gray-400 mb-3 text-center">Debug login (no backend)</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  login(
                    { id: "debug-waiter", email: "waiter@debug", role: "waiter", displayName: "Debug Waiter" },
                    "debug-token"
                  );
                  navigate("/waiter");
                }}
              >
                Waiter
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  login(
                    { id: "debug-cook", email: "cook@debug", role: "cook", displayName: "Debug Cook" },
                    "debug-token"
                  );
                  navigate("/cook");
                }}
              >
                Cook
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  login(
                    { id: "debug-manager", email: "manager@debug", role: "manager", displayName: "Debug Manager" },
                    "debug-token"
                  );
                  navigate("/manager");
                }}
              >
                Manager
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-center text-gray-400">
              This bypasses API auth and may show empty data if backend is offline.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
