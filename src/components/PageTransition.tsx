"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // No AnimatePresence/exit-wait here on purpose: the new page must mount
  // and start fetching immediately on navigation, not wait for the old one
  // to finish animating out first. Just a quick fade-in on the incoming page.
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.div>
  );
}
