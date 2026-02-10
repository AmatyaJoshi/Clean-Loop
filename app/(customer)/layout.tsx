"use client";

import { ReactNode } from "react";
import CustomerChatbot from "@/components/CustomerChatbot";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CustomerChatbot />
    </>
  );
}
