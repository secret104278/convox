import "~/styles/globals.css";

import { M_PLUS_1p } from "next/font/google";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { Suspense } from "react";
import clsx from "clsx";

const mPlus1p = M_PLUS_1p({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConveX",
  description: "Conversational practice for language learners",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW" className={clsx(mPlus1p.className)}>
      <body>
        <TRPCReactProvider>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
