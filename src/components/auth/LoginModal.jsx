import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

// Supabase (and JS in general) can throw errors in several different
// shapes. This makes sure we always end up with a readable string
// instead of "[object Object]" or "{}".
function getErrorMessage(err) {
  console.error("Auth error:", err);
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string" && err.trim()) return err;

  const msg = err.message || err.error_description || err.error || err.msg;
  if (typeof msg === "string" && msg.trim()) return msg;

  // Error objects hide their real properties (like .message) from
  // JSON.stringify by default, which is why this used to show "{}".
  // Pull every property manually instead, enumerable or not.
  try {
    const plain = {};
    Object.getOwnPropertyNames(err).forEach((k) => {
      try { plain[k] = err[k]; } catch {}
    });
    const asString = JSON.stringify(plain);
    if (asString && asString !== "{}") return asString;
  } catch {
    // ignore
  }

  if (err.name) return `Error: ${err.name}`;
  if (err.status) return `Request failed (status ${err.status})`;
  return "Something went wrong. Please try again.";
}

const inputClass =
  "bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus-visible:ring-purple-500";
const labelClass = "text-gray-200";

export default function LoginModal({ open, onClose, onSuccess }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const resetAndClose = () => {
    setError("");
    setLoading(false);
    onClose?.();
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email: signInEmail, password: signInPassword });
      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        email: signUpEmail,
        password: signUpPassword,
        full_name: fullName,
        username,
      });
      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetAndClose()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Welcome to PlaySoFlo</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="signin" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className={labelClass}>Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  required
                  className={inputClass}
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className={labelClass}>Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  required
                  className={inputClass}
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded p-2">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className={labelClass}>Full Name</Label>
                <Input
                  id="signup-name"
                  required
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-username" className={labelClass}>Username</Label>
                <Input
                  id="signup-username"
                  required
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className={labelClass}>Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  required
                  className={inputClass}
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className={labelClass}>Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  required
                  minLength={6}
                  className={inputClass}
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded p-2">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
