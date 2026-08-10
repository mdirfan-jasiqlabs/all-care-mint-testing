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

export interface TrustIndicator {
  id: string;
  label: string;
  subtitle: string;
  icon: 'shield' | 'clock' | 'lock';
}

export interface FooterCTAConfig {
  title: string;
  description: string;
  buttonLabel: string;
  appDownloadUrl?: string;
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
    brandStatement: string;
    trustIndicators: TrustIndicator[];
    cta: FooterCTAConfig;
    exploreLinks: NavItem[];
    companyLinks: NavItem[];
    quickLinks: NavItem[];
    legalLinks: NavItem[];
    contactInfo: ContactInfo;
    socialLinks: SocialLink[];
  };
}

export const siteConfig: SiteConfig = {
  name: "All care",
  brandNameHighlight: "mint",
  tagline: "On-Demand Home Services Marketplace",
  location: {
    city: "Indore",
    state: "MP",
  },
  logo: {
    src: "/logo.png",
    alt: "All care mint Logo",
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
    copyright: `© 2026 All care mint. All rights reserved.`,
    description: "Trusted home services,\ndelivered by verified professionals.",
    brandStatement: "We care for your home, like it's our own.",
    trustIndicators: [
      {
        id: "verified",
        label: "Verified Professionals",
        subtitle: "Background verified & trusted",
        icon: "shield",
      },
      {
        id: "fast",
        label: "Quick Booking",
        subtitle: "Book your service in minutes",
        icon: "clock",
      },
      {
        id: "secure",
        label: "Secure & Reliable",
        subtitle: "Your data and privacy are safe",
        icon: "lock",
      },
    ],
    cta: {
      title: "Get the All care mint App",
      description: "Book services on the go\nanytime, anywhere.",
      buttonLabel: "GET IT ON Google Play",
    },
    exploreLinks: [
      { label: "Home", href: "/" },
      { label: "Services", href: "/services" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Why Us", href: "/about" },
      { label: "Become a Partner", href: "/become-a-provider" },
    ],
    companyLinks: [
      { label: "About Us", href: "/about" },
      { label: "Support", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
    ],
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
      address: "All care mint HQ, Tech Park, India",
      supportHours: "24/7 Customer Assistance",
    },
    socialLinks: [
      { platform: "Facebook", url: "https://facebook.com", iconName: "facebook" },
      { platform: "Instagram", url: "https://instagram.com", iconName: "instagram" },
      { platform: "WhatsApp", url: "https://whatsapp.com", iconName: "whatsapp" },
      { platform: "YouTube", url: "https://youtube.com", iconName: "youtube" },
    ],
  },
};
