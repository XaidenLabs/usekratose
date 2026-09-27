"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { navigation } from "@/constants";
import Button from "../atoms/button";
import MenuSvg from "../svg/menu-svg";
import { HamburgerMenu } from "../design/navbar";
import { BrandLogo } from "../brand-logo";

type NavigationUser = {
  readonly avatarUrl: string | null;
  readonly email: string;
  readonly initials: string;
};

const dashboardUrl =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001";

function toNavigationUser(user: {
  readonly email?: string;
  readonly user_metadata: Record<string, unknown>;
}): NavigationUser {
  const displayName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const email = user.email ?? "Signed-in account";
  const initialsSource = displayName || email;
  const initials = initialsSource
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    avatarUrl:
      typeof user.user_metadata.avatar_url === "string" &&
      user.user_metadata.avatar_url.trim() !== ""
        ? user.user_metadata.avatar_url
        : null,
    email,
    initials: initials || "UK",
  };
}

const Navbar = () => {
  const router = useRouter();
  const [hash, setHash] = useState<string>("#hero");
  const [openNavigation, setOpenNavigation] = useState<boolean>(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<NavigationUser | null>(null);

  useEffect(() => {
    const dynamicNavbarHighlight = () => {
      const sections = document.querySelectorAll("section[id]");

      sections.forEach((current) => {
        if (current === null) return;

        const sectionId = current.getAttribute("id");
        const sectionHeight = (current as HTMLElement).offsetHeight;
        const sectionTop =
          current.getBoundingClientRect().top - sectionHeight * 0.2;

        if (
          sectionTop < 0 &&
          sectionTop + sectionHeight > 0 &&
          hash !== sectionId
        ) {
          setHash(`#${sectionId as string}`);
        }
      });
    };

    window.addEventListener("scroll", dynamicNavbarHighlight);

    return () => window.removeEventListener("scroll", dynamicNavbarHighlight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setUser(
        data.session === null ? null : toNavigationUser(data.session.user),
      );
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session === null ? null : toNavigationUser(session.user));
      if (session === null) setAccountOpen(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const toggleNavigation = () => setOpenNavigation(!openNavigation);
  const handleClick = () => {
    if (!openNavigation) return;

    setOpenNavigation(false);
  };

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    setAccountOpen(false);
    router.refresh();
  }

  return (
    <div
      className={cn(
        `fixed top-0 left-0 w-full z-50 border-b border-n-6 lg:bg-n-8/90 lg:backdrop-blur-sm`,
        openNavigation ? "bg-n-8" : "bg-n-8/90 backdrop-blur-sm",
      )}
    >
      <div
        className={cn(`flex items-center px-5 max-lg:py-4 lg:px-7.5 xl:px-10`)}
      >
        <Link
          href="#hero"
          className={cn(`flex w-48 items-center gap-3 xl:mr-8`)}
        >
          <BrandLogo className="size-10" />
          <span className="text-lg font-semibold tracking-tight">
            UseKratose
          </span>
        </Link>

        <nav
          className={cn(
            `fixed inset-x-0 bottom-0 top-20 hidden bg-n-8 lg:static lg:mx-auto lg:flex lg:bg-transparent`,
            openNavigation ? "flex" : "hidden",
          )}
        >
          <div
            className={cn(
              "relative z-2 flex flex-col items-center justify-center m-auto lg:flex-row",
            )}
          >
            {navigation
              .filter((item) => user === null || !item.onlyMobile)
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  onClick={handleClick}
                  className={cn(
                    `block relative font-code text-2xl uppercase text-n-1 transition-colors hover:text-color-1`,
                    "px-6 py-6 md:py-8 lg:-mr-0.25 lg:text-xs lg:font-semibold",
                    item.onlyMobile && "lg:hidden",
                    item.url === hash ? "z-2 lg:text-n-1" : "lg:text-n-1/50",
                    "lg:leading-5 lg:hover:text-n-1 xl:px-12",
                  )}
                >
                  {item.title}
                </Link>
              ))}
          </div>
          <HamburgerMenu />
        </nav>

        {user === null ? (
          <>
            <Link
              href={`${dashboardUrl}/signup`}
              className="landing-button mr-8 hidden text-n-1/50 transition-colors hover:text-n-1 lg:block"
            >
              New account
            </Link>
            <Button className="hidden lg:flex" href={`${dashboardUrl}/login`}>
              Sign in
            </Button>
          </>
        ) : (
          <div className="landing-account">
            <button
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label="Open account menu"
              className="landing-profile-trigger"
              onClick={() => setAccountOpen((value) => !value)}
              type="button"
            >
              <span
                className="landing-profile-avatar"
                style={
                  user.avatarUrl === null
                    ? undefined
                    : { backgroundImage: `url(${user.avatarUrl})` }
                }
              >
                {user.avatarUrl === null ? user.initials : null}
              </span>
            </button>
            {accountOpen ? (
              <div className="landing-profile-menu" role="menu">
                <span>{user.email}</span>
                <Link
                  href={`${dashboardUrl}/overview`}
                  onClick={() => setAccountOpen(false)}
                  role="menuitem"
                >
                  Dashboard
                </Link>
                <button onClick={signOut} role="menuitem" type="button">
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        )}

        <Button
          className="ml-auto lg:hidden"
          px="px-3"
          onClick={toggleNavigation}
        >
          <MenuSvg openNavigation={openNavigation} />
        </Button>
      </div>
    </div>
  );
};

export default Navbar;
