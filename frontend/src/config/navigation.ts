// src/config/navigation.ts
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Video, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  UserCircle,
  LucideIcon 
} from "lucide-react";
import { UserRole } from "@/types/auth";

export interface NavItemConfig {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavSectionConfig {
  title?: string;
  items: NavItemConfig[];
}

export const TUTOR_NAVIGATION: NavSectionConfig[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Teaching",
    items: [
      { label: "Students", href: "/dashboard/students", icon: Users },
      { label: "Sessions", href: "/dashboard/sessions", icon: Video },
      { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { label: "Homework", href: "/dashboard/homework", icon: BookOpen },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const STUDENT_NAVIGATION: NavSectionConfig[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/portal", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Learning",
    items: [
      { label: "My Sessions", href: "/portal/sessions", icon: Video },
      { label: "Homework", href: "/portal/homework", icon: BookOpen },
      { label: "Progress", href: "/portal/progress", icon: TrendingUp },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Profile", href: "/settings", icon: UserCircle },
    ],
  },
];

export function getNavigationForRole(role?: UserRole): NavSectionConfig[] {
  if (role === "student") {
    return STUDENT_NAVIGATION;
  }
  return TUTOR_NAVIGATION;
}