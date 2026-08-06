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
  location: {
    city: string;
    state: string;
  };
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
  name: "All-Care",
  brandNameHighlight: "MINT",
  tagline: "On-Demand Home Services Marketplace",
  location: {
    city: "Indore",
    state: "MP",
  },
  logo: {
    src: "/logo.png",
    alt: "All-Care MINT Logo",
  },
  mainNav: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Why Us", href: "/about" },
    { label: "Become a Partner", href: "/become-a-provider" },
    { label: "Support", href: "/contact" },
  ],
  headerActions: [
    {
      label: "Book a Service",
      href: "/services",
      variant: "primary",
    },
    {
      label: "Admin Login",
      href: "/admin/login",
      variant: "secondary",
    },
  ],
  footer: {
    copyright: `© ${new Date().getFullYear()} All-Care MINT. All rights reserved.`,
    description: "Book verified local professionals for cleaning, AC repair, plumbing, painting, and more—in less than 60 seconds.",
    quickLinks: [
      { label: "Home", href: "/" },
      { label: "Services", href: "/services" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Why Us", href: "/about" },
      { label: "Become a Partner", href: "/become-a-provider" },
      { label: "Support", href: "/contact" },
    ],
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
    contactInfo: {
      email: "support@allcaremint.com",
      phone: "+91 1800-ALL-CARE",
      address: "All-Care MINT HQ, Tech Park, India",
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
