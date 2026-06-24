export const metadata = {
  title: "Korbiz World Cup 2026 Bracket",
  description: "Korbiz internal World Cup 2026 bracket challenge",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
