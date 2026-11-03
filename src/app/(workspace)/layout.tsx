import { App } from "@/components/app";
import type { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <App />
      {children}
    </>
  );
}
