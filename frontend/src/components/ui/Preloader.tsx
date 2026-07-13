"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("stackradar_visited");
    if (!hasVisited) {
      setShouldShow(true);
      document.body.style.overflow = "hidden";

      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 5) + 3;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setTimeout(() => {
            setIsDone(true);
            document.body.style.overflow = "";
            sessionStorage.setItem("stackradar_visited", "true");
          }, 800);
        }
        setProgress(currentProgress);
      }, 40);

      return () => {
        clearInterval(interval);
        document.body.style.overflow = "";
      };
    } else {
      setIsDone(true);
    }
  }, []);

  if (!shouldShow || isDone) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden pointer-events-none">
        {/* Top Half Split */}
        <motion.div
          initial={{ y: 0 }}
          animate={progress === 100 ? { y: "-100%" } : { y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 left-0 w-full h-1/2 bg-[#141726] border-b border-[#4338CA]/15 pointer-events-auto"
        />

        {/* Bottom Half Split */}
        <motion.div
          initial={{ y: 0 }}
          animate={progress === 100 ? { y: "100%" } : { y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 w-full h-1/2 bg-[#141726] pointer-events-auto"
        />

        {/* Cinematic progress text */}
        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={progress >= 40 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-bold tracking-[0.4em] font-display text-white/60 uppercase text-center"
          >
            STACKRADAR
          </motion.div>
          <div className="text-7xl md:text-9xl font-black font-display gradient-text tracking-tighter leading-none select-none">
            {progress}%
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
