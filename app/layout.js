import "./globals.css";

export const metadata = {
  title: "MemeVerse",
  description: "Live meme quiz for campus events",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
