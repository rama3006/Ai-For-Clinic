// app/layout.tsx
export const metadata = {
  title: "AI for Clinic",
  description: "Clinic assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
