import { describe, expect, it } from "vitest";
import { passwordResetEmail, priceAlertEmail } from "./email";

describe("passwordResetEmail", () => {
  const url = "https://flightcompare.tn/fr/reset-password?token=abc123";

  it("builds a French reset message", () => {
    const content = passwordResetEmail({ name: "Sami", url, locale: "fr" });
    expect(content.subject).toContain("mot de passe");
    expect(content.html).toContain(url);
    expect(content.text).toContain(url);
    expect(content.html).toContain("Sami");
  });

  it("builds English and Arabic messages with the right direction", () => {
    const en = passwordResetEmail({ name: "Sam", url, locale: "en" });
    expect(en.subject).toContain("password");
    expect(en.html).toContain('dir="ltr"');

    const ar = passwordResetEmail({ name: "سامي", url, locale: "ar" });
    expect(ar.subject).toContain("كلمة المرور");
    expect(ar.html).toContain('dir="rtl"');
  });

  it("escapes user-supplied names", () => {
    const content = passwordResetEmail({
      name: '<script>alert("x")</script>',
      url,
      locale: "fr",
    });
    expect(content.html).not.toContain("<script>");
    expect(content.html).toContain("&lt;script&gt;");
  });
});

describe("priceAlertEmail", () => {
  const base = {
    name: "Sami",
    locale: "fr" as const,
    route: "TUN-IST",
    price: "250 EUR",
    target: "300 EUR",
    provider: "Travelpayouts (prix en cache)",
    url: "https://flightcompare.tn/fr/search?origin=TUN",
  };

  it("includes route, price and call to action", () => {
    const content = priceAlertEmail(base);
    expect(content.subject).toContain("TUN-IST");
    expect(content.subject).toContain("250 EUR");
    expect(content.html).toContain(base.url);
    expect(content.text).toContain("300 EUR");
  });

  it("uses English and Arabic copy", () => {
    expect(priceAlertEmail({ ...base, locale: "en" }).subject).toContain("Price alert");
    expect(priceAlertEmail({ ...base, locale: "ar" }).subject).toContain("تنبيه");
  });
});
