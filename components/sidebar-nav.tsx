"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  ContactsIcon,
  DealsIcon,
  ProfileIcon,
  SettingsIcon,
} from "@/components/icons";

// Deals + Settings are admin-only. Deals sits next to Contacts (the leads that
// feed the pipeline); Settings goes last.
export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const NAV = [
    { href: "/", label: "Dashboard", Icon: DashboardIcon },
    { href: "/contacts", label: "Contacts", Icon: ContactsIcon },
    ...(isAdmin ? [{ href: "/deals", label: "Deals", Icon: DealsIcon }] : []),
    { href: "/profile", label: "Profile", Icon: ProfileIcon },
    ...(isAdmin
      ? [{ href: "/settings", label: "Settings", Icon: SettingsIcon }]
      : []),
  ];

  return (
    <nav className="flex-1 px-3 py-5">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Menu
      </p>
      <div className="space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-brand text-white shadow-[0_2px_12px_-2px_rgba(170,7,39,0.6)]"
                  : "text-gray-100 hover:bg-brand hover:text-white"
              }`}
            >
              <item.Icon
                className={`mr-2.5 h-4.5 w-4.5 shrink-0 ${
                  active ? "text-white" : "text-gray-300"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
