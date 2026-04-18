import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

type Mode = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate("/settings");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
        else {
          toast.success("Signed in");
          navigate("/settings");
        }
      } else if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) toast.error(error.message);
        else toast.success("Check your email to confirm your account");
      } else {
        const { error } = await resetPassword(email);
        if (error) toast.error(error.message);
        else toast.success("Password reset email sent");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: "Sign In",
    signup: "Create Account",
    forgot: "Reset Password",
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-24">
      <Link to="/settings" className="self-start mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <Card className="w-full max-w-md p-6 backdrop-blur-xl bg-card/80">
        <h1 className="text-2xl font-bold mb-1">{titles[mode]}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" && "Sync your data across devices"}
          {mode === "signup" && "Create an account to sync across devices"}
          {mode === "forgot" && "We'll email you a reset link"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Please wait..." : titles[mode]}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-sm text-center">
          {mode === "signin" && (
            <>
              <button onClick={() => setMode("signup")} className="text-primary hover:underline block w-full">
                Don't have an account? Sign up
              </button>
              <button onClick={() => setMode("forgot")} className="text-muted-foreground hover:text-foreground block w-full">
                Forgot password?
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">
              Already have an account? Sign in
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("signin")} className="text-primary hover:underline">
              Back to sign in
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
