"use client";

import dynamic from "next/dynamic";

const QuizPageClient = dynamic(() => import("./QuizPageClient"), { ssr: false });

export default function QuizPage() {
  return <QuizPageClient />;
}
