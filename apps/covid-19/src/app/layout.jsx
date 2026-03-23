import "@/styles/globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata = {
  title: "COVID-19 Dashboard",
  description: "COVID-19 data visualization dashboard",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
  ],
};

const RootLayout = ({ children }) => (
  <html lang="en">
    <body className="min-h-screen bg-gray-900 text-white">
      <Navigation />
      <main>{children}</main>
      <Footer />
    </body>
  </html>
);

export default RootLayout;
