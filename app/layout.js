import "./globals.css";



export const metadata = {
  title: "TSS Shop",
  description: "TSS Shop E-Commerce Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}