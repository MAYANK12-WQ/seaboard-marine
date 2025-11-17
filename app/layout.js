import './globals.css';

export const metadata = {
  title: 'Seaboard Marine - RPG Documentation Generator',
  description: 'Professional AS400/RPG to Reverse Engineering Document Generator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
