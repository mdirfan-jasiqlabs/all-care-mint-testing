export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface HeaderActionButton {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
  isExternal?: boolean;
}

export interface SocialLink {
  platform: string;
  url: string;
  iconName: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
  supportHours: string;
}

export interface SiteConfig {
  name: string;
  brandNameHighlight: string;
  tagline: string;
  logo: {
    src: string;
    alt: string;
  };
  mainNav: NavItem[];
  headerActions: HeaderActionButton[];
  footer: {
    copyright: string;
    description: string;
    quickLinks: NavItem[];
    legalLinks: NavItem[];
    contactInfo: ContactInfo;
    socialLinks: SocialLink[];
  };
}

export const siteConfig: SiteConfig = {
  name: "All Care",
  brandNameHighlight: "Mint",
  tagline: "On-Demand Home Services Marketplace",
  logo: {
    src: "/logo.png",
    alt: "All Care Mint Logo",
  },
  mainNav: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Become a Provider", href: "/become-a-provider" },
    { label: "Contact", href: "/contact" },
  ],
  headerActions: [
    {
      label: "Admin Login",
      href: "/admin/login",
      variant: "secondary",
    },
    {
      label: "Download App",
      href: "/#download",
      variant: "primary",
    },
  ],
  footer: {
    copyright: `© ${new Date().getFullYear()} All Care Mint Marketing Team`,
    description: "Get verified, top-rated local service professionals for plumbing, electrical, cleaning, and appliance repair in under 60 seconds.",
    quickLinks: [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Become a Provider", href: "/become-a-provider" },
      { label: "Contact", href: "/contact" },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
    contactInfo: {
      email: "support@allcaremint.com",
      phone: "+91 1800-ALL-CARE",
      address: "All Care Mint HQ, Tech Park, Bengaluru, India",
      supportHours: "24/7 Customer Assistance",
    },
    socialLinks: [
      { platform: "Twitter", url: "https://twitter.com/allcaremint", iconName: "twitter" },
      { platform: "Facebook", url: "https://facebook.com/allcaremint", iconName: "facebook" },
      { platform: "Instagram", url: "https://instagram.com/allcaremint", iconName: "instagram" },
      { platform: "LinkedIn", url: "https://linkedin.com/company/allcaremint", iconName: "linkedin" },
    ],
  },
};
