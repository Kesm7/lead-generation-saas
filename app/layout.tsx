import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SignalDesk — Lead generation workspace',
  description: 'A focused workspace to organize, qualify, and move your sales prospects forward.',
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
