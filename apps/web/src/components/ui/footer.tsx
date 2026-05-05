"use client";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";

const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut" as const,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const linkVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

const backgroundVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 2,
      ease: "easeOut" as const,
    },
  },
};

const NavSection = ({
  title,
  links,
  index,
}: {
  title: string;
  links: { label: string; to: string }[];
  index: number;
}) => {
  const renderLink = (link: { label: string; to: string }, linkIndex: number) => {
    const linkContent = (
      <motion.span
        variants={linkVariants}
        custom={linkIndex}
        whileHover={{
          x: 8,
          transition: { type: "spring", stiffness: 300, damping: 20 },
        }}
        className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-sans text-xs md:text-sm group relative inline-block"
      >
        {link.label}
      </motion.span>
    );

    if (link.to.startsWith("http") || link.to.startsWith("#")) {
      return (
        <a key={linkIndex} href={link.to} target={link.to.startsWith("http") ? "_blank" : undefined} rel={link.to.startsWith("http") ? "noreferrer" : undefined}>
          {linkContent}
        </a>
      );
    }

    return (
      <Link
        key={linkIndex}
        to={link.to}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        {linkContent}
      </Link>
    );
  };

  return (
    <motion.div variants={itemVariants} custom={index} className="flex flex-col gap-2">
      <motion.h3
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
        className="mb-2 uppercase text-muted-foreground text-xs font-semibold tracking-wider border-b border-border pb-1 hover:text-foreground transition-colors duration-300"
      >
        {title}
      </motion.h3>
      {links.map(renderLink)}
    </motion.div>
  );
};

export default function StickyFooter() {
  const footerData = {
    sections: [
      {
        title: m.footer_product(),
        links: [
          { label: m.nav_home(), to: "/" },
          { label: m.open_dashboard(), to: "/dashboard" },
          { label: m.nav_changelog(), to: "/changelog" },
        ],
      },
      {
        title: m.footer_company(),
        links: [
          { label: m.nav_about(), to: "/about" },
          { label: m.integration_github(), to: "https://github.com/NeitherCupid139/OrchOS" },
        ],
      },
      {
        title: m.footer_resources(),
        links: [
          { label: m.footer_documentation(), to: "/docs" },
          { label: m.footer_community(), to: "#" },
          { label: m.footer_help_center(), to: "#" },
        ],
      },
    ],
    title: m.about_orchos(),
    copyright: `©${new Date().getFullYear()} ${m.about_orchos()}. ${m.footer_rights()}`,
  };

  return (
    <div
      className="relative h-[45vh]"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="relative h-[calc(100vh+45vh)] -top-[100vh]">
        <div className="h-[45vh] sticky top-[calc(100vh-45vh)]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="bg-gradient-to-br from-card via-muted to-card/90 py-6 md:py-12 px-4 md:px-12 h-full w-full flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />

            <motion.div
              variants={backgroundVariants}
              className="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-primary/5 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut" as const,
              }}
            />

            <motion.div variants={containerVariants} className="relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 lg:gap-20">
                {footerData.sections.map((section, index) => (
                  <NavSection
                    key={section.title}
                    title={section.title}
                    links={section.links}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" as const }}
              className="flex flex-col md:flex-row justify-between items-start md:items-end relative z-10 gap-4 md:gap-6 mt-6"
            >
              <div className="flex-1">
                <div className="relative inline-flex max-w-full items-center justify-center leading-[0.8]">
                  <h1
                    className="relative z-10 cursor-default font-serif italic leading-[0.8] text-foreground"
                    style={{ fontSize: "clamp(3.5rem, 10vw, 8rem)" }}
                  >
                    {footerData.title}
                  </h1>
                </div>

                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4"
                >
                  <motion.div
                    className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-primary to-secondary"
                    animate={{
                      scaleX: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut" as const,
                    }}
                  />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.6, duration: 0.6 }}
                className="text-left md:text-right"
              >
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8, duration: 0.5 }}
                  className="text-muted-foreground text-xs md:text-sm hover:text-foreground transition-colors duration-300"
                >
                  {footerData.copyright}
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
