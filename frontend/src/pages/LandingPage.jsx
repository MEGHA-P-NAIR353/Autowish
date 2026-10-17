import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Heart,
  Mail,
  Menu,
  MessageCircle,
  MessageSquareHeart,
  Moon,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

import AmbientBackground from "../components/ui/AmbientBackground";
import ThemeToggle from "../components/ui/ThemeToggle";

/*
 * IMPORTANT:
 * Change this to your real support email address before deploying.
 */
const SUPPORT_EMAIL = "autowish.ai@gmail.com";

const features = [
  {
    icon: Sparkles,
    title: "AI-powered wishes",
    description:
      "Create personalized birthday, anniversary, festival, and special-event messages in seconds.",
    color: "text-violet-500",
    background: "bg-violet-500/10",
  },
  {
    icon: CalendarDays,
    title: "Smart scheduling",
    description:
      "Plan your wishes ahead of time and keep important dates from slipping through the cracks.",
    color: "text-blue-500",
    background: "bg-blue-500/10",
  },
  {
    icon: Heart,
    title: "Personal connections",
    description:
      "Organize your contacts and make every greeting feel thoughtful, personal, and memorable.",
    color: "text-pink-500",
    background: "bg-pink-500/10",
  },
  {
    icon: Bell,
    title: "Helpful reminders",
    description:
      "Stay aware of upcoming occasions with reminders that help you remember the people who matter.",
    color: "text-amber-500",
    background: "bg-amber-500/10",
  },
  {
    icon: MessageCircle,
    title: "Flexible messages",
    description:
      "Choose a tone and language that fit your relationship, occasion, and personal style.",
    color: "text-emerald-500",
    background: "bg-emerald-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Account control",
    description:
      "Manage your account and preferences from one place, with privacy and security in mind.",
    color: "text-cyan-500",
    background: "bg-cyan-500/10",
  },
];

const steps = [
  {
    number: "01",
    title: "Add your important dates",
    description:
      "Keep your contacts and their special occasions organized in one convenient place.",
    icon: CalendarDays,
  },
  {
    number: "02",
    title: "Create a meaningful wish",
    description:
      "Use AI to create a message that matches the recipient, occasion, language, and tone.",
    icon: WandSparkles,
  },
  {
    number: "03",
    title: "Plan and stay organized",
    description:
      "Prepare your greetings ahead of time and use available scheduling features to manage them.",
    icon: Clock3,
  },
];

const testimonials = [
  {
    quote:
      "I used to forget birthdays even when they were important to me. Having everything organized makes a real difference.",
    name: "A happy user",
    role: "Personal use",
    initials: "HU",
  },
  {
    quote:
      "The AI-generated messages give me a starting point when I don't know how to express what I want to say.",
    name: "A happy user",
    role: "Everyday greetings",
    initials: "AG",
  },
  {
    quote:
      "I like being able to keep contacts and special occasions together instead of managing everything separately.",
    name: "A happy user",
    role: "Contact management",
    initials: "CM",
  },
];

const faqs = [
  {
    question: "What is Auto-Wish AI?",
    answer:
      "Auto-Wish AI is a platform designed to help you organize special occasions and create personalized wishes using AI. Depending on the features available in your account, you can manage contacts, prepare messages, and work with scheduled wishes.",
  },
  {
    question: "Can I personalize the messages?",
    answer:
      "Yes. You can use the available message-generation options to tailor a wish to the recipient, occasion, relationship, tone, and language. Always review the generated message before sending it.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "You can explore this public landing page and read the Privacy Policy and Terms & Conditions without signing in. An account is required for features that use your personal workspace.",
  },
  {
    question: "Will Auto-Wish AI send messages automatically?",
    answer:
      "Automatic delivery depends on the delivery channels and scheduling features configured for your account. Creating or scheduling a wish does not guarantee delivery. Review the status shown in your account and ensure your integrations are configured correctly.",
  },
  {
    question: "Can I use Auto-Wish AI in different languages?",
    answer:
      "The AI wish generator may support multiple languages. Available languages and the quality of individual generated messages can vary, so review each message before using it.",
  },
  {
    question: "How can I contact support?",
    answer:
      "You can contact the support team using the email address linked in the footer. Replace the configured support address with your real support email before publishing the website.",
  },
];

const legalContent = {
  privacy: {
    eyebrow: "YOUR PRIVACY MATTERS",
    title: "Privacy Policy",
    description:
      "This policy explains how Auto-Wish AI may collect, use, store, and protect information when you use the platform.",
    sections: [
      {
        title: "1. Information we may collect",
        paragraphs: [
          "Depending on the features you use, Auto-Wish AI may process account information such as your name, email address, authentication information, and account preferences.",
          "If you use contact, event, or greeting features, you may provide recipient names, dates, relationships, contact details, message content, and other information you choose to enter.",
          "We may also process technical information such as browser details, device information, diagnostic logs, and information about how you interact with the service.",
        ],
      },
      {
        title: "2. How information is used",
        paragraphs: [
          "Information may be used to provide and maintain the service, authenticate users, manage contacts and events, generate requested greetings, process scheduled tasks, respond to support requests, and improve reliability and security.",
          "We may use operational information to diagnose errors, prevent abuse, enforce our terms, and comply with applicable legal obligations.",
        ],
      },
      {
        title: "3. AI-generated content",
        paragraphs: [
          "Information you submit to a wish-generation feature may be processed by the AI provider configured for the service to generate a response. The information required depends on your request and the feature you use.",
          "AI-generated messages can contain errors or unsuitable wording. Review generated content before sharing it with another person.",
          "Do not submit sensitive personal information unless it is necessary for the feature and you have an appropriate legal basis to do so.",
        ],
      },
      {
        title: "4. Messages and third-party services",
        paragraphs: [
          "If you connect email, messaging, SMS, or other delivery services, information may be shared with the relevant provider to carry out your requested action. Those providers may process information under their own privacy terms.",
          "Delivery depends on provider availability, account permissions, recipient details, and other technical conditions. We cannot guarantee that every message will be delivered.",
        ],
      },
      {
        title: "5. Cookies and technical storage",
        paragraphs: [
          "The application may use cookies or similar technologies where needed for authentication, security, preferences, and service functionality. The technologies actually used depend on the deployed application configuration.",
          "You can manage certain cookies through your browser settings. Disabling essential technologies may prevent some features from working correctly.",
        ],
      },
      {
        title: "6. Data retention and deletion",
        paragraphs: [
          "Information may be retained for as long as necessary to provide the service, maintain account records, resolve disputes, protect the platform, or comply with legal obligations.",
          "You may be able to delete information through the account features provided by the application. Deletion may not immediately remove backups, records that must legally be retained, or information held independently by third-party providers.",
        ],
      },
      {
        title: "7. Security",
        paragraphs: [
          "We aim to protect information through appropriate technical and organizational measures. No online service or electronic storage system can be guaranteed to be completely secure.",
          "Keep your login credentials confidential and contact support if you believe your account has been accessed without authorization.",
        ],
      },
      {
        title: "8. Sharing and disclosure",
        paragraphs: [
          "Information may be disclosed to service providers that help operate the platform, where you authorize a third-party integration, when required by law, or when reasonably necessary to protect the rights, safety, and security of users and the service.",
          "We do not describe a practice as being in place unless it is supported by the actual deployed application and its service-provider arrangements.",
        ],
      },
      {
        title: "9. Your choices and rights",
        paragraphs: [
          "Depending on your location and applicable law, you may have rights to access, correct, delete, restrict, or object to certain processing of your personal information.",
          "You can contact the service operator using the support contact below to ask about privacy-related requests. We may need to verify your identity before processing a request.",
        ],
      },
      {
        title: "10. Children's privacy",
        paragraphs: [
          "The service is not intended to be used by children where such use would violate applicable law. Do not knowingly provide personal information that you are not authorized to share.",
        ],
      },
      {
        title: "11. Changes to this policy",
        paragraphs: [
          "This policy may be updated when the service, its providers, or applicable legal requirements change. The revised version will be published on this page with an updated revision date.",
        ],
      },
      {
        title: "12. Contact",
        paragraphs: [
          `For privacy questions or requests, contact ${SUPPORT_EMAIL}. Replace this address with your verified support contact before publishing the application.`,
        ],
      },
    ],
  },
  terms: {
    eyebrow: "PLEASE READ CAREFULLY",
    title: "Terms & Conditions",
    description:
      "These terms describe the general conditions for accessing and using Auto-Wish AI.",
    sections: [
      {
        title: "1. Acceptance of terms",
        paragraphs: [
          "By accessing or using Auto-Wish AI, you agree to these Terms & Conditions. If you do not agree, do not use the service.",
          "Additional terms may apply to specific subscriptions, payment services, integrations, or features. Where applicable, those terms should be read together with this document.",
        ],
      },
      {
        title: "2. Eligibility and accounts",
        paragraphs: [
          "You must be legally permitted to use the service in your jurisdiction. You agree to provide accurate account information, maintain the security of your credentials, and keep your account information reasonably up to date.",
          "You are responsible for activities performed through your account, subject to applicable law. Notify support promptly if you suspect unauthorized access.",
        ],
      },
      {
        title: "3. Acceptable use",
        paragraphs: [
          "You must use the platform lawfully and responsibly. You must not use it to harass, threaten, defraud, impersonate, spam, or otherwise harm another person.",
          "You must not attempt to gain unauthorized access, interfere with the service, bypass security controls, misuse integrations, distribute malicious code, or use the platform in a way that violates applicable law or third-party rights.",
        ],
      },
      {
        title: "4. Contacts and recipient information",
        paragraphs: [
          "You are responsible for the information you upload or enter, including contact details and recipient information. You must have the rights, permissions, and lawful basis required to use that information for your intended purpose.",
          "Only upload files and contact lists that you are authorized to use. Check recipient details carefully before scheduling or sending messages.",
        ],
      },
      {
        title: "5. AI-generated content",
        paragraphs: [
          "AI-generated messages are provided as assistance and may be inaccurate, repetitive, inappropriate, or incomplete. You are responsible for reviewing and approving messages before using them.",
          "You retain responsibility for the content you submit and for deciding whether generated content is appropriate for its recipient and intended use.",
          "Do not rely on generated content as professional, legal, medical, financial, or other specialist advice.",
        ],
      },
      {
        title: "6. Scheduling and message delivery",
        paragraphs: [
          "Scheduling features depend on application configuration, background processing, recipient information, integrations, and third-party availability.",
          "A scheduled message may be delayed, rejected, or fail to send. You should check the status displayed by the application and must not assume that a message has been delivered unless the service confirms it.",
          "You are responsible for complying with applicable messaging, privacy, anti-spam, consent, and telecommunications rules when contacting recipients.",
        ],
      },
      {
        title: "7. Third-party services",
        paragraphs: [
          "The platform may integrate with third-party services for AI generation, email, messaging, payments, hosting, or other functions. Their availability and operation may be subject to separate terms and policies.",
          "We are not responsible for independent third-party systems or their policies, subject to rights and responsibilities that cannot be excluded under applicable law.",
        ],
      },
      {
        title: "8. Subscriptions and payments",
        paragraphs: [
          "If paid plans are offered, their prices, features, usage limits, renewal terms, and cancellation rules should be shown before purchase.",
          "Where payment functionality is enabled, payments and refunds are subject to the terms disclosed at checkout and applicable law. Do not assume that a paid feature is available unless it is presented as available in your account.",
        ],
      },
      {
        title: "9. Intellectual property",
        paragraphs: [
          "The platform's software, branding, design, and other materials may be protected by intellectual property laws. You may not copy, distribute, modify, or exploit protected platform materials except as permitted by law or with authorization.",
          "You remain responsible for ensuring that content you upload or submit does not infringe another person's rights. Rights in AI-generated output may depend on applicable law and the terms of the relevant AI provider.",
        ],
      },
      {
        title: "10. Availability and changes",
        paragraphs: [
          "Features may be modified, suspended, or discontinued to maintain, secure, or improve the service. We will make reasonable efforts to avoid unnecessary disruption where practical.",
          "We do not guarantee uninterrupted access, error-free operation, or compatibility with every device or third-party service.",
        ],
      },
      {
        title: "11. Suspension and termination",
        paragraphs: [
          "Access may be restricted or suspended where reasonably necessary to protect the platform, investigate suspected misuse, comply with law, or enforce these terms.",
          "You may stop using the service and use any account-deletion features made available to you. Certain records may need to be retained where required by law or for legitimate operational purposes.",
        ],
      },
      {
        title: "12. Disclaimer and liability",
        paragraphs: [
          "To the extent permitted by applicable law, the service is provided on an available basis without guarantees that every feature will meet every user's requirements.",
          "Nothing in these terms excludes or limits a liability, consumer right, or other protection that cannot lawfully be excluded or limited. Any applicable limitations must be interpreted consistently with mandatory law.",
        ],
      },
      {
        title: "13. Changes to these terms",
        paragraphs: [
          "These terms may be updated as the service evolves. The latest version will be published on this page with an updated revision date. Continued use after an update takes effect may constitute acceptance where permitted by applicable law.",
        ],
      },
      {
        title: "14. Governing law and contact",
        paragraphs: [
          "Applicable law and dispute-resolution arrangements should be confirmed by the service operator and specified here before production deployment. Nothing in these terms removes mandatory protections available under the law applicable to you.",
          `For questions about these terms, contact ${SUPPORT_EMAIL}. Replace this address and have the final terms reviewed for your business and jurisdiction before launch.`,
        ],
      },
    ],
  },
};

const revealVariants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

function MotionSection({
  children,
  className = "",
  id,
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      className={className}
      variants={revealVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
    >
      {children}
    </motion.section>
  );
}

function Brand({ compact = false }) {
  return (
    <Link
      to="/"
      aria-label="Auto-Wish AI home"
      className="inline-flex shrink-0 items-center gap-2.5"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
        <MessageSquareHeart size={21} strokeWidth={2.2} />
      </span>

      {!compact && (
        <span className="text-lg font-bold tracking-tight text-fg">
          Auto-Wish
          <span className="ml-1 text-primary">AI</span>
        </span>
      )}
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = true,
}) {
  return (
    <div
      className={`mb-12 max-w-2xl ${
        centered ? "mx-auto text-center" : ""
      }`}
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
        {eyebrow}
      </p>

      <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

function LegalPage({ type }) {
  const shouldReduceMotion = useReducedMotion();
  const policy = legalContent[type];

  if (!policy) {
    return null;
  }

  return (
    <div className="min-h-screen bg-app text-fg">
      <AmbientBackground />

      <header className="relative z-10 border-b border-line/70 bg-app/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link
              to="/"
              className="hidden items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-fg sm:inline-flex"
            >
              <ArrowDown className="rotate-90" size={16} />
              Back to home
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Get started
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary"
          >
            <ArrowDown className="rotate-90" size={15} />
            Return to Auto-Wish AI
          </Link>

          <div className="mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-bold tracking-wide text-primary">
              <ShieldCheck size={14} />
              {policy.eyebrow}
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-fg sm:text-5xl lg:text-6xl">
              {policy.title}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-muted sm:text-lg">
              {policy.description}
            </p>

            <p className="mt-5 text-sm text-muted">
              Last updated: October 13, 2026
            </p>
          </div>

          <div className="mb-10 rounded-2xl border border-line bg-surface/70 p-5 sm:p-6">
            <p className="text-sm leading-7 text-muted">
              Please read this document carefully. It describes general
              policies for the platform and should be reviewed against the
              actual features, service providers, business practices, and
              legal requirements that apply to your deployment.
            </p>
          </div>

          <div className="space-y-10">
            {policy.sections.map((section) => (
              <section
                key={section.title}
                className="border-b border-line/70 pb-8 last:border-0"
              >
                <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
                  {section.title}
                </h2>

                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.title}-${index}`}
                      className="text-sm leading-8 text-muted sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail size={20} />
              </span>

              <div>
                <h2 className="text-lg font-bold text-fg">
                  Have a question?
                </h2>

                <p className="mt-2 text-sm leading-7 text-muted">
                  Contact our team if you have questions about this document
                  or how the service operates.
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  {SUPPORT_EMAIL}
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Brand />

          <p>
            © {new Date().getFullYear()} Auto-Wish AI. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <Link
              to="/privacy"
              className="transition hover:text-fg"
            >
              Privacy Policy
            </Link>

            <Link
              to="/terms"
              className="transition hover:text-fg"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LandingHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);

    if (sectionId === "home") {
      window.scrollTo({
        top: 0,
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });

      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const navItems = [
    { label: "Features", id: "features" },
    { label: "How it works", id: "how-it-works" },
    { label: "Pricing", id: "pricing" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-app text-fg">
      <AmbientBackground />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-line/60 bg-app/80 backdrop-blur-2xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <Brand />

          <div className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="text-sm font-medium text-muted transition hover:text-fg"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle />

            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-fg"
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Get started
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setMobileMenuOpen((previous) => !previous)}
              aria-label={
                mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-fg transition hover:bg-surface"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-line bg-app px-4 pb-5 pt-3 sm:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="rounded-xl px-3 py-3 text-left text-sm font-medium text-muted transition hover:bg-surface hover:text-fg"
                >
                  {item.label}
                </button>
              ))}

              <div className="my-2 border-t border-line" />

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-semibold text-muted hover:bg-surface"
              >
                Log in
              </Link>

              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"
              >
                Get started
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section
          id="home"
          className="relative scroll-mt-24 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pt-28"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary sm:text-sm">
                <Sparkles size={15} />
                Make every special moment count
                <ChevronRight size={14} />
              </div>

              <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl md:text-6xl lg:text-7xl">
                Never forget a moment that{" "}
                <span className="bg-gradient-to-r from-primary via-violet-500 to-pink-500 bg-clip-text text-transparent">
                  matters.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-muted sm:text-lg">
                Create thoughtful wishes, organize important dates, and keep
                the people you care about close. Let AI help you find the
                right words for every occasion.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/25"
                >
                  Start for free
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection("how-it-works")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface/60 px-6 py-4 text-sm font-semibold text-fg transition hover:bg-surface"
                >
                  See how it works
                  <ArrowDown size={16} />
                </button>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Personalized messages
                </span>

                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Important dates organized
                </span>
              </div>
            </motion.div>

            {/* Animated preview */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative mx-auto w-full max-w-xl"
            >
              <div className="absolute -inset-8 rounded-full bg-primary/10 blur-3xl" />

              <motion.div
                animate={
                  shouldReduceMotion
                    ? {}
                    : { y: [0, -9, 0] }
                }
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative rounded-[28px] border border-line bg-surface/90 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6"
              >
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <WandSparkles size={20} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-fg">
                        AI Wish Studio
                      </p>
                      <p className="text-xs text-muted">
                        A little more personal
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Ready
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-line bg-app p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Occasion
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-500">
                          <Heart size={19} />
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-fg">
                            Birthday wish
                          </p>
                          <p className="text-xs text-muted">
                            For someone special
                          </p>
                        </div>
                      </div>

                      <ChevronDown size={17} className="text-muted" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-line bg-app p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Your message
                      </p>

                      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <Sparkles size={12} />
                        AI crafted
                      </span>
                    </div>

                    <div className="rounded-xl bg-primary/[0.06] p-4">
                      <p className="text-sm leading-7 text-fg">
                        Wishing you a beautiful birthday filled with laughter,
                        wonderful surprises, and moments that make you smile.
                        May the year ahead bring you happiness, new adventures,
                        and everything your heart hopes for. 💜
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">
                        Warm
                      </span>
                      <span className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">
                        Personal
                      </span>
                      <span className="rounded-full border border-line px-3 py-1.5 text-xs text-muted">
                        Heartfelt
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl bg-primary p-4 text-white">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Check size={20} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        Your words, made easier
                      </p>
                      <p className="mt-1 text-xs text-white/75">
                        Review, personalize, and share
                      </p>
                    </div>

                    <ArrowUpRight size={19} />
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={shouldReduceMotion ? {} : { y: [0, 7, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -left-5 top-20 hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl sm:flex"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <CalendarDays size={19} />
                </span>

                <div>
                  <p className="text-xs font-bold text-fg">
                    Special day saved
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    Stay one step ahead
                  </p>
                </div>
              </motion.div>

              <motion.div
                animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -right-4 bottom-24 hidden items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl sm:flex"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Star size={19} />
                </span>

                <div>
                  <p className="text-xs font-bold text-fg">
                    Made more personal
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    A message that feels like you
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-line/70 bg-surface/35 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
            <p className="text-sm font-medium text-muted">
              Everything you need to make occasions more meaningful
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-semibold text-fg/75">
              <span className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                AI-assisted writing
              </span>

              <span className="flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" />
                Event organization
              </span>

              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                Account controls
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <MotionSection
          id="features"
          className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Everything in one place"
              title="Thoughtful wishes. Less effort."
              description="Spend less time remembering dates and finding the right words, and more time making people feel appreciated."
            />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <motion.article
                    key={feature.title}
                    variants={revealVariants}
                    className="group rounded-3xl border border-line bg-surface/60 p-6 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-surface hover:shadow-xl hover:shadow-black/[0.04] sm:p-7"
                  >
                    <div
                      className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl ${feature.background} ${feature.color} transition-transform duration-300 group-hover:scale-110`}
                    >
                      <Icon size={22} />
                    </div>

                    <h3 className="text-lg font-bold text-fg">
                      {feature.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-muted">
                      {feature.description}
                    </p>

                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                      Make it meaningful
                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </MotionSection>

        {/* How it works */}
        <MotionSection
          id="how-it-works"
          className="scroll-mt-24 border-y border-line/70 bg-surface/30 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Simple by design"
              title="From special date to special message"
              description="A simple workflow helps you organize occasions and prepare greetings without unnecessary complexity."
            />

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.number}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.12,
                    }}
                    className="relative rounded-3xl border border-line bg-surface p-7 sm:p-8"
                  >
                    <div className="mb-8 flex items-center justify-between">
                      <span className="text-4xl font-bold tracking-tight text-primary/25">
                        {step.number}
                      </span>

                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon size={22} />
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-fg">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-muted">
                      {step.description}
                    </p>

                    {index < steps.length - 1 && (
                      <div className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 text-primary md:block">
                        <ArrowRight size={24} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </MotionSection>

        {/* Message showcase */}
        <MotionSection className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-primary">
                Your sentiment, your style
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
                The right words for every kind of relationship.
              </h2>

              <p className="mt-5 text-base leading-8 text-muted">
                A birthday message to a close friend should feel different
                from a professional greeting to a colleague. Use AI as a
                starting point, then make the message your own.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Choose a tone that fits the occasion.",
                  "Personalize the message for the recipient.",
                  "Review and edit before sharing.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <Check size={14} />
                    </span>

                    <p className="text-sm leading-6 text-fg/85">{item}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className="mt-9 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Create your first wish
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-8 rounded-full bg-pink-500/10 blur-3xl" />

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65 }}
                className="relative rounded-[28px] border border-line bg-surface p-5 shadow-xl sm:p-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-fg">
                      Message preview
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      A little warmth goes a long way
                    </p>
                  </div>

                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-500">
                    <Heart size={20} />
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-line">
                  <div className="bg-gradient-to-br from-violet-500/15 via-pink-500/10 to-amber-500/10 p-6 sm:p-8">
                    <div className="mb-5 flex justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface/80 text-pink-500 shadow-sm">
                        <Heart size={28} />
                      </div>
                    </div>

                    <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
                      A special wish
                    </p>

                    <h3 className="mt-4 text-center text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                      Happy Birthday!
                    </h3>

                    <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-7 text-fg/80">
                      May your day be full of genuine smiles, wonderful
                      surprises, and the people who make life brighter.
                      Wishing you a year filled with new memories and
                      beautiful possibilities. ✨
                    </p>

                    <div className="mt-6 text-center text-xl tracking-widest">
                      💜 🎂 🌷
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-app px-4 py-3">
                    <span className="text-xs text-muted">
                      Example message preview
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                      <CheckCircle2 size={14} />
                      Ready to personalize
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </MotionSection>

        {/* Testimonials */}
        <MotionSection
          className="border-y border-line/70 bg-surface/30 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Made for everyday moments"
              title="Make remembering feel effortless"
              description="Auto-Wish AI is designed to help people organize occasions and express their feelings more easily."
            />

            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.role}
                  className="rounded-3xl border border-line bg-surface p-6 sm:p-7"
                >
                  <div className="mb-5 flex gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={15}
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  <blockquote className="text-sm leading-7 text-fg/85">
                    “{testimonial.quote}”
                  </blockquote>

                  <div className="mt-7 flex items-center gap-3 border-t border-line pt-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {testimonial.initials}
                    </span>

                    <div>
                      <p className="text-sm font-bold text-fg">
                        {testimonial.name}
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-5 text-center text-xs text-muted">
              Illustrative testimonials. Replace these examples with genuine,
              permission-approved customer feedback before publishing.
            </p>
          </div>
        </MotionSection>

        {/* Pricing */}
        <MotionSection
          id="pricing"
          className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Simple and flexible"
              title="A plan for your way of wishing"
              description="Explore the options available in your account and choose the features that fit your needs."
            />

            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-line bg-surface p-7 sm:p-9">
                <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  GET STARTED
                </span>

                <h3 className="mt-5 text-2xl font-bold text-fg">Free</h3>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Start organizing occasions and exploring the features
                  available to your account.
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold tracking-tight text-fg">
                    Free
                  </span>
                </div>

                <div className="my-7 border-t border-line" />

                <ul className="space-y-4">
                  {[
                    "Access to your account dashboard",
                    "Available AI wish-generation features",
                    "Contact and event management",
                    "Access to available reminders",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-emerald-500"
                      />

                      <span className="text-sm text-fg/85">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className="mt-9 flex items-center justify-center gap-2 rounded-xl border border-line px-5 py-3.5 text-sm font-bold text-fg transition hover:bg-app"
                >
                  Create a free account
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="relative rounded-3xl border border-primary/40 bg-surface p-7 shadow-xl shadow-primary/[0.07] sm:p-9">
                <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  <Zap size={13} />
                  PREMIUM
                </div>

                <h3 className="mt-5 text-2xl font-bold text-fg">
                  Premium
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted">
                  For users who need higher limits or additional features,
                  where a premium plan is available.
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold tracking-tight text-fg">
                    View plans
                  </span>
                </div>

                <div className="my-7 border-t border-line" />

                <ul className="space-y-4">
                  {[
                    "Higher usage limits, if offered",
                    "Additional features, if included",
                    "Plan-specific account benefits",
                    "Applicable subscription support",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-primary"
                      />

                      <span className="text-sm text-fg/85">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className="mt-9 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  Explore your options
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-6 text-muted">
              Pricing and plan features shown in your application or checkout
              are authoritative. Update this section to match the exact
              subscription plans, limits, and payment options actually
              implemented in your deployment.
            </p>
          </div>
        </MotionSection>

        {/* FAQ */}
        <MotionSection
          id="faq"
          className="scroll-mt-24 border-y border-line/70 bg-surface/30 px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
        >
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Frequently asked questions"
              title="Questions? We've got answers."
              description="Learn more about creating wishes and using Auto-Wish AI."
            />

            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                const answerId = `faq-answer-${index}`;

                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-2xl border border-line bg-surface"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaq(isOpen ? -1 : index)
                      }
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                    >
                      <span className="text-sm font-semibold leading-6 text-fg sm:text-base">
                        {faq.question}
                      </span>

                      <ChevronDown
                        size={19}
                        className={`shrink-0 text-muted transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={answerId}
                        className="px-5 pb-5 sm:px-6 sm:pb-6"
                      >
                        <p className="text-sm leading-7 text-muted">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-9 text-center">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Still have questions?
                Contact support
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </MotionSection>

        {/* Final CTA */}
        <MotionSection className="px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-primary/20 bg-primary/[0.06] px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
                <MessageSquareHeart size={25} />
              </span>

              <h2 className="mx-auto mt-7 max-w-3xl text-3xl font-bold tracking-tight text-fg sm:text-4xl lg:text-5xl">
                Make every wish a little more meaningful.
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted">
                Start organizing your special dates and create messages that
                help the people in your life feel remembered.
              </p>

              <Link
                to="/register"
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 transition hover:-translate-y-1 hover:opacity-90"
              >
                Get started today
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </MotionSection>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface/30 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Brand />

              <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
                A thoughtful way to organize special occasions and create
                personalized wishes with the help of AI.
              </p>

              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary"
              >
                <Mail size={16} />
                {SUPPORT_EMAIL}
              </a>
            </div>

            <div>
              <h3 className="text-sm font-bold text-fg">Product</h3>

              <div className="mt-4 flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection("features")}
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Features
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("how-it-works")}
                  className="text-sm text-muted transition hover:text-fg"
                >
                  How it works
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("pricing")}
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Pricing
                </button>

                <Link
                  to="/register"
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Get started
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-fg">Account</h3>

              <div className="mt-4 flex flex-col items-start gap-3">
                <Link
                  to="/login"
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Log in
                </Link>

                <Link
                  to="/register"
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Create account
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection("faq")}
                  className="text-sm text-muted transition hover:text-fg"
                >
                  FAQ
                </button>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Support
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-fg">Legal</h3>

              <div className="mt-4 flex flex-col items-start gap-3">
                <Link
                  to="/privacy"
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Privacy Policy
                </Link>

                <Link
                  to="/terms"
                  className="text-sm text-muted transition hover:text-fg"
                >
                  Terms & Conditions
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} Auto-Wish AI. All rights reserved.
            </p>

            <p className="flex items-center gap-1.5">
              Made for meaningful moments
              <Heart size={12} className="text-pink-500" />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/*
 * The same file serves:
 *   /           -> Landing page
 *   /privacy    -> Privacy Policy
 *   /terms      -> Terms & Conditions
 *
 * The React Router configuration must render this component on all three
 * paths and must not wrap these public paths in authentication protection.
 */
export default function LandingPage() {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/privacy") {
    return <LegalPage type="privacy" />;
  }

  if (pathname === "/terms") {
    return <LegalPage type="terms" />;
  }

  return <LandingHome />;
}
