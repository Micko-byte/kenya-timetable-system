import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const scrollToPricing = () => {
    if (location.pathname !== "/") {
      navigate("/#pricing");
      return;
    }

    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Shrink header once the page is scrolled
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHomePage = location.pathname === "/";
  const isSignUpPage = location.pathname === "/signup";
  const isAuthPage = location.pathname === "/auth";
  const isPricingActive = isHomePage && typeof window !== "undefined" && window.location.hash === "#pricing";

  // Enroll button should be active only on signup page
  const isEnrollActive = isSignUpPage;
  // Login button should be active only on auth page
  const isLoginActive = isAuthPage;

  return (
    <>
      {/* Desktop & Mobile Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          hasScrolled ? "" : ""
        }`}
        style={{
          padding: hasScrolled ? "0.45rem 1rem" : "0.65rem 1rem",
        }}
      >
        <div
          className={`mx-auto rounded-full px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
            hasScrolled ? "max-w-5xl" : "max-w-7xl"
          }`}
          style={{
            background: "rgba(3, 7, 18, 0.6)",
            backdropFilter: "blur(12px)",
            padding: hasScrolled ? "0.45rem 1.15rem" : "0.65rem 1.25rem",
            boxShadow: hasScrolled ? "0 16px 40px rgba(3, 7, 18, 0.14)" : "none",
          }}
        >
          <div className="flex justify-between items-center">
            {/* Logo - Left */}
            <div
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
              onClick={() => navigate("/")}
            >
              <img src={logo} alt="ElimuTime logo" className="h-12 w-auto md:h-16 flex-shrink-0 object-contain" />
            </div>

            {/* Desktop Navigation - Center */}
            <div className={`hidden md:flex items-center justify-center flex-1 transition-all duration-300 ${hasScrolled ? "gap-6" : "gap-8"}`}>
              {/* Home Link */}
              <button
                onClick={() => navigate("/")}
                className={`relative font-semibold text-base transition-all duration-200 group ${
                  isHomePage
                    ? "text-white dark:text-white"
                    : "text-white dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Home
                <div
                  className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-200 ${
                    isHomePage ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </button>

              {/* Enroll Link - Always goes to signup */}
              <button
                onClick={() => navigate("/signup")}
                className={`relative font-semibold text-base transition-all duration-200 group ${
                  isEnrollActive
                    ? "text-white dark:text-white"
                    : "text-white dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Enroll
                <div
                  className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-200 ${
                    isEnrollActive ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </button>

              <button
                onClick={scrollToPricing}
                className={`relative font-semibold text-base transition-all duration-200 group ${
                  isPricingActive
                    ? "text-white dark:text-white"
                    : "text-white dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Pricing
                <div
                  className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-200 ${
                    isPricingActive ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </button>
            </div>

            {/* Desktop Log In Button - Right */}
            <div className="hidden md:block">
              <Button
                onClick={() => navigate("/auth")}
                className={`font-semibold px-6 py-2 rounded-full transition-all duration-200 ${
                  isLoginActive
                    ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                    : "bg-primary text-white hover:bg-white/90 hover:text-primary hover:border-black"
                }`}
              >
                Log In
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-900 dark:text-white" />
              ) : (
                <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 top-[64px] md:hidden z-40 bg-black/20"
          style={{ backdropFilter: "blur(8px)" }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          className="fixed top-[64px] left-0 right-0 md:hidden z-40 overflow-hidden animate-in slide-in-from-top-2 mx-4"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(189, 67, 16, 0.1)",
            borderRadius: "0.75rem",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
            {/* Home Link */}
            <button
              onClick={() => {
                navigate("/");
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 relative group ${
                isHomePage
                  ? "text-primary dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Home
              <div
                className={`absolute bottom-2 left-4 h-0.5 bg-primary transition-all duration-200 ${
                  isHomePage ? "w-[calc(100%-2rem)]" : "w-0 group-hover:w-[calc(100%-2rem)]"
                }`}
              />
            </button>

            {/* Enroll Link - Always goes to signup */}
            <button
              onClick={() => {
                navigate("/signup");
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 relative group ${
                isEnrollActive
                  ? "text-primary dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Enroll
              <div
                className={`absolute bottom-2 left-4 h-0.5 bg-primary transition-all duration-200 ${
                  isEnrollActive ? "w-[calc(100%-2rem)]" : "w-0 group-hover:w-[calc(100%-2rem)]"
                }`}
              />
            </button>

            <button
              onClick={() => {
                scrollToPricing();
                setIsMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 relative group ${
                isPricingActive
                  ? "text-primary dark:text-primary"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Pricing
              <div
                className={`absolute bottom-2 left-4 h-0.5 bg-primary transition-all duration-200 ${
                  isPricingActive ? "w-[calc(100%-2rem)]" : "w-0 group-hover:w-[calc(100%-2rem)]"
                }`}
              />
            </button>

            {/* Log In Button - Always goes to auth */}
            <Button
              onClick={() => {
                navigate("/auth");
                setIsMenuOpen(false);
              }}
              className={`w-full font-semibold py-3 rounded-lg transition-all duration-200 ${
                isLoginActive
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
            >
              Log In
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
