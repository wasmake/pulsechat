import type { Metadata } from 'next';

import '@stream-io/video-react-sdk/dist/css/styles.css';
import 'stream-chat-react/dist/css/v2/index.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseChat',
  description: 'Team chat powered by Stream and Authy SSO.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-white bg-purple antialiased">{children}</body>
    </html>
  );
}
