"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Search, Bell, TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function Navbar() {
  const router = useRouter();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => router.push("/")}
            >
              <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                EventLimit
              </span>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              v1.0 alpha
            </span>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => router.push("/")}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => router.push("/alpha-vantage")}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center space-x-1"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Alpha Vantage</span>
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/create-strategy")}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Create Strategy
            </button>
            <button
              onClick={() => router.push("/swap")}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Swap
            </button>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search tokens, events..."
                className="pl-10 pr-4 py-2 w-64 text-sm"
              />
            </div>

            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>

            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
