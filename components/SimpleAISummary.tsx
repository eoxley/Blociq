"use client";

import { useEffect, useState } from "react";

const getGreeting = (hour: number) => {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

interface SimpleAISummaryProps {
  user?: {
    name?: string;
  };
  className?: string;
  showSubtitle?: boolean;
}

export default function SimpleAISummary({ user, className = "", showSubtitle = true }: SimpleAISummaryProps) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    const localHour = new Date().getHours(); // This is client-side
    setGreeting(getGreeting(localHour));
  }, []);

  return (
    <div className={className}>
      <h1 className="text-3xl font-bold">
        {greeting}, {user?.name || "there"}!
      </h1>
      {showSubtitle && <p className="text-muted-foreground">How can I help you today?</p>}
    </div>
  );
} 