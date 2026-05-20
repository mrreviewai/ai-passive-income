import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function relativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: Array<[number, string]> = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [factor, u] of intervals) {
    if (value < factor) {
      unit = u;
      break;
    }
    value = Math.floor(value / factor);
    unit = u;
  }
  return `${value}${unit} ago`;
}
