"use client";

import { GuidancePanel } from "@/components/guidance-panel";
import { useSampleSession } from "@/components/sample-session-provider";
import type { SampleCourse } from "@/lib/sample-courses";

export function GuidanceScreen({ course, cardId }: { course: SampleCourse; cardId: string }) {
  const selected = cardId === "course" || course.assignments.some((assignment) => assignment.id === cardId) ? cardId : "course";
  const session = useSampleSession();
  return <GuidancePanel course={course} cardId={selected} text={session.cardText(course, selected)} />;
}
