"use client";

import { type ReactNode } from "react";
import { PopupLayout } from "@/components/layout/popup-layout";

export function PolicyPageLayout({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  const defaultOnClose = () => {
    if (typeof window !== "undefined") {
      window.close();
    } else {
      history.back();
    }
  };

  return (
    <PopupLayout title={title} onClose={onClose ?? defaultOnClose} contentClassName="px-4">
      <div className="space-y-6 text-sm text-muted-foreground whitespace-pre-line">
        {children}
      </div>
    </PopupLayout>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
      {children}
    </section>
  );
}

export function PolicyList({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
      {children}
    </ul>
  );
}

export function PolicyInfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 p-4 bg-muted rounded-md">
      {children}
    </div>
  );
}
