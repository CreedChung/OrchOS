"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

export function SignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError("Sign in failed. Please check your credentials.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <fieldset className="space-y-1.5">
        <label htmlFor="sign-in-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="sign-in-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          required
        />
      </fieldset>

      <fieldset className="space-y-1.5">
        <label htmlFor="sign-in-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="sign-in-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </fieldset>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? m.loading() : m.sign_in_title()}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  if (!isLoaded) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === "missing_requirements" && result.verifications?.emailAddress) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setVerifying(true);
      } else if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError("Sign up failed. Please try again.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <form onSubmit={handleVerify} className="w-full space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the verification code sent to {email}.
        </p>

        <fieldset className="space-y-1.5">
          <label htmlFor="sign-up-code" className="text-sm font-medium text-foreground">
            Verification code
          </label>
          <Input
            id="sign-up-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            required
          />
        </fieldset>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? m.loading() : "Verify"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <fieldset className="space-y-1.5">
        <label htmlFor="sign-up-email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="sign-up-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
          required
        />
      </fieldset>

      <fieldset className="space-y-1.5">
        <label htmlFor="sign-up-password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="sign-up-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </fieldset>

      <fieldset className="space-y-1.5">
        <label htmlFor="sign-up-confirm" className="text-sm font-medium text-foreground">
          Confirm password
        </label>
        <Input
          id="sign-up-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </fieldset>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? m.loading() : m.sign_up_title()}
      </Button>
    </form>
  );
}
