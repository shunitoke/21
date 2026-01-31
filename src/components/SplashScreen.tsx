"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

const programNames: Record<string, string> = {
  ru: "ПРОГРАММА 21",
  en: "PROGRAM 21",
  de: "PROGRAMM 21",
  fr: "PROGRAMME 21",
  es: "PROGRAMA 21",
  it: "PROGRAMMA 21",
  pt: "PROGRAMA 21",
  zh: "程序 21",
  ja: "プログラム 21",
  ko: "프로그램 21",
};

export default function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [systemLang, setSystemLang] = useState("en");

  useEffect(() => {
    // Detect system language
    const lang = navigator.language.split("-")[0];
    setSystemLang(lang in programNames ? lang : "en");

    // Minimum display duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  const programName = programNames[systemLang] || programNames.en;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0f1115 0%, #1a1d24 50%, #0f1115 100%)",
          }}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/10"
                initial={{
                  x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
                  y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
                }}
                animate={{
                  y: [null, -100],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "linear",
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-8">
            {/* Logo "21" */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1], // Spring-like easing
              }}
              className="relative"
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 blur-3xl"
                style={{
                  background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)",
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* "21" text */}
              <motion.span
                className="relative block text-[120px] font-bold leading-none tracking-tighter"
                style={{
                  fontFamily: "'Zvezda NHZDN', sans-serif",
                  background: "linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
                animate={{
                  textShadow: [
                    "0 0 20px rgba(99,102,241,0.3)",
                    "0 0 40px rgba(99,102,241,0.6)",
                    "0 0 20px rgba(99,102,241,0.3)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                21
              </motion.span>
            </motion.div>

            {/* Program name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.6,
                delay: 0.3,
                ease: "easeOut",
              }}
              className="text-center"
            >
              <h1
                className="text-2xl font-bold tracking-[0.3em]"
                style={{
                  fontFamily: "'Zvezda NHZDN', sans-serif",
                  color: "#fff",
                  textShadow: "0 0 30px rgba(99,102,241,0.5)",
                }}
              >
                {programName}
              </h1>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-indigo-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Bottom gradient fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: "linear-gradient(to top, #0f1115, transparent)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
