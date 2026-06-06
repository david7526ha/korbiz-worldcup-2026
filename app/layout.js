import "./globals.css";
export const metadata = {
  title: "Korbiz World Cup 2026 Bracket",
  description: "Official Korbiz World Cup 2026 bracket challenge",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
