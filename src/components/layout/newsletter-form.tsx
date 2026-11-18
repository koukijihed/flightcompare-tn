"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm({ inverted = false }: { inverted?: boolean }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setState("error");
        setMessage(payload.error ?? t("newsletterTitle"));
        return;
      }
      setState("done");
      setEmail("");
      setMessage(t("newsletterSuccess"));
    } catch {
      setState("error");
      setMessage(t("newsletterTitle"));
    }
  }

  if (state === "done") {
    return (
      <p
        className={
          inverted
            ? "flex items-center gap-2 text-sm font-medium text-turquoise-200"
            : "flex items-center gap-2 text-sm font-medium text-turquoise-700"
        }
        role="status"
      >
        <Check className="h-4 w-4" aria-hidden />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("newsletterPlaceholder")}
          aria-label={t("newsletterPlaceholder")}
          className={
            inverted
              ? "border-white/20 bg-white/10 text-white placeholder:text-white/50"
              : ""
          }
        />
        <Button type="submit" variant="accent" disabled={state === "loading"}>
          <Send className="h-4 w-4" aria-hidden />
          {state === "loading" ? t("newsletterCta") : t("newsletterCta")}
        </Button>
      </div>
      {state === "error" ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-300">
          {message}
        </p>
      ) : null}
    </form>
  );
}
