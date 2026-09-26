import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'CodeAtlas | Understand your code',
  description:
    'An AI-powered code review workspace. Review, explore, and understand your projects with your preferred AI model.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
