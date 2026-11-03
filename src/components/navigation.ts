"use client";
import {
  Activity,
  Baby,
  BookOpen,
  CalendarDays,
  Camera,
  House,
  Image as ImageIcon,
  Settings,
  Users,
  Sparkles,
} from "lucide-react";
export const sections = [
  ["/", "Inicio", House],
  ["/bebe", "Mi bebé", Baby],
  ["/salud", "Salud", Activity],
  ["/agenda", "Agenda", CalendarDays],
  ["/familia", "Familia", Users],
] as const;
export const extra = [
  ["/ecografias", "Ecografías", ImageIcon],
  ["/pancita", "Mi pancita", Camera],
  ["/diario", "Diario", BookOpen],
  ["/herramientas", "Herramientas", Sparkles],
  ["/configuracion", "Configuración", Settings],
] as const;
