"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NavLink = ({ href, children }) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white focus:outline-none ${
        isActive ? "bg-gray-800 hover:bg-gray-800 focus:bg-gray-800" : ""
      }`}
    >
      {children}
    </Link>
  );
};

const Navigation = () => {
  return (
    <nav className="mb-4 sm:mb-8">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="border-b border-gray-700">
          <div className="flex h-16 items-center justify-between px-4 sm:px-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img className="h-8 w-8" src="/logo.svg" alt="Covid-19 Dashboard" />
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <NavLink href="/">Trend</NavLink>
                <NavLink href="/distribution">Distribution</NavLink>
              </div>
            </div>
            <div className="ml-6 flex items-center text-xs text-gray-400">
              <div className="relative ml-3">7th March, 2021</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
