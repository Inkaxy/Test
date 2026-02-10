import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFirstPackingStatus<T>(ps: T | T[] | null | undefined): T | null {
  if (!ps) return null;
  return Array.isArray(ps) ? ps[0] || null : ps;
}
