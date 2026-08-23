import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  Link,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { BlissProvider } from "../lib/bliss-data";
import { SiteLayout } from "../components/site-layout";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bliss & Beyond" },
      { name: "description", content: "Bliss & Beyond event planning and catering." },
      { name: "author", content: "Bliss & Beyond" },
      { property: "og:title", content: "Bliss & Beyond" },
      {
        property: "og:description",
        content: "Event planning, catering, packages and venue booking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();

  useEffect(() => {
    const target = getPrototypeTarget(location.pathname);

    if (target) {
      window.location.replace(target);
    }
  }, [location.pathname]);

  const target = getPrototypeTarget(location.pathname);

  if (target) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BlissProvider>
        <SiteLayout>
          <Outlet />
        </SiteLayout>
      </BlissProvider>
    </QueryClientProvider>
  );
}

function getPrototypeTarget(pathname: string) {
  if (pathname === "/") return "/prototype/index.html";
  if (pathname === "/packages") return "/prototype/packages.html";
  if (pathname === "/venues") return "/prototype/venues.html";
  if (pathname === "/booking") return "/prototype/customer/booking.html";
  if (pathname === "/catering") return "/prototype/customer/custom-package.html";
  if (pathname === "/profile") return "/prototype/customer/profile.html";
  if (pathname === "/login") return "/prototype/login.html";
  if (pathname === "/register") return "/prototype/register.html";
  if (pathname === "/confirmation") return "/prototype/customer/booking-status.html";
  if (pathname === "/admin") return "/prototype/admin/dashboard.html";
  if (pathname === "/admin/bookings") return "/prototype/admin/bookings.html";
  if (pathname === "/admin/customers") return "/prototype/admin/customers.html";
  if (pathname === "/admin/packages") return "/prototype/admin/packages.html";
  if (pathname === "/admin/services") return "/prototype/admin/services.html";
  if (pathname === "/admin/venues") return "/prototype/admin/venues.html";
  return null;
}
