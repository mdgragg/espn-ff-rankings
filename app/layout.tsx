import "./globals.css";

export const metadata = {
  title: "ESPN Fantasy Football Power Rankings",
  description: "ESPN Fantasy Football Power Rankings",
  icons: {
    icon: "/images/ff-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
