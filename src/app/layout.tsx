export const metadata = {
  title: 'M-T Transport',
  description: 'M-T Transport boshqaruv tizimi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
