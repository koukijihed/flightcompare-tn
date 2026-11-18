import { getTranslations } from "next-intl/server";
import { LogIn, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { LocaleSwitcher } from "./locale-switcher";
import { CurrencySwitcher } from "./currency-switcher";
import { UserMenu } from "./user-menu";
import { getCurrentUser } from "@/modules/auth/session";
import { getDisplayCurrency } from "@/modules/currency/cookies";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const [user, currency, t] = await Promise.all([
    getCurrentUser(),
    getDisplayCurrency(),
    getTranslations("nav"),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100/80 bg-white/95 backdrop-blur">
      <div className="container-page relative flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="FlightCompare TN">
          <Logo />
        </Link>

        <NavLinks loggedIn={Boolean(user)} />

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <CurrencySwitcher value={currency} className="hidden sm:inline-flex" />

          {user ? (
            <UserMenu
              firstName={user.firstName}
              lastName={user.lastName}
              role={user.role}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <LogIn className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t("login")}</span>
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="accent" size="sm" className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">{t("register")}</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
