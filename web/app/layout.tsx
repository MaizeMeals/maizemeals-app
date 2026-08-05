import type { Metadata } from "next";
import { Roboto, Poppins, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { ConditionalHeader } from "@/components/layout/ConditionalHeader";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SignInSuccessToast } from "@/components/auth/sign-in-success-toast";
import { cn } from "@/lib/utils";
import { PostHogProvider } from "@/app/providers";

// 2. Configure Roboto (Body Default)
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

// 3. Configure Poppins (Standard Headings)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

// 4. Configure Playfair (Special/Hero Headings)
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MaizeMeals",
  description: "U-M Dining Companion App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          roboto.variable,
          poppins.variable,
          instrument.variable,
          "min-h-screen bg-background text-foreground font-sans antialiased",

        )}
      >
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConditionalHeader>
              <Header />
            </ConditionalHeader>
            <main className="grow">{children}</main>
            <ConditionalFooter />
            <Toaster />
            <SignInSuccessToast />
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
