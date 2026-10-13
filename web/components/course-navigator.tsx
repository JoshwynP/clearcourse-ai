"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavCourse } from "@/components/app-shell";

const sections: { view: Exclude<CourseView, "home">; label: string; href: (courseId: string) => string }[] = [
  { view: "conversation", label: "Discussion board", href: (id) => `/courses/${id}/conversation` },
  { view: "guidance", label: "AI cards", href: (id) => `/courses/${id}/guidance` },
  { view: "participation", label: "Participation", href: (id) => `/courses/${id}/participation` },
  { view: "studio", label: "Manage My Cards", href: (id) => `/courses/${id}/studio` },
  { view: "settings", label: "Course settings", href: (id) => `/courses/${id}/settings` },
];

type CourseView = "home" | "conversation" | "guidance" | "studio" | "participation" | "settings";

export function CourseNavigator({ courses, courseId, view, studio, owner, participation }: {
  courses: NavCourse[];
  courseId?: string;
  view?: CourseView;
  studio: boolean;
  owner: boolean;
  participation: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = courses.filter((course) => `${course.code} ${course.name}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return <section className={courses.length ? "course-collection" : "course-collection no-courses"} aria-label="Your courses">
    <div className="sidebar-section-label">Your courses <span>({courses.length})</span></div>
    {courses.length ? <><label className="course-search-label" htmlFor="course-search">Search your courses</label>
    <input id="course-search" className="field course-search" type="search" placeholder="Search courses" value={query} onChange={(event) => setQuery(event.target.value)} /></> : null}
    <div className="course-list-scroll">
      {visible.length ? visible.map((item) => <CourseGroup key={item.id} course={item} current={item.id === courseId} view={item.id === courseId ? view : undefined} studio={studio} owner={owner} participation={participation} />) :
        <p className="course-empty">{courses.length ? "No courses match your search." : "Your courses will appear here."}</p>}
    </div>
  </section>;
}

function CourseGroup({
  course,
  current,
  view,
  studio,
  owner,
  participation,
}: {
  course: NavCourse;
  current: boolean;
  view?: CourseView;
  studio: boolean;
  owner: boolean;
  participation: boolean;
}) {
  const onHome = current && view === "home";
  const visible = sections.filter((section) =>
    (section.view !== "studio" || studio) &&
    (section.view !== "settings" || owner) &&
    (section.view !== "participation" || participation));
  return (
    <div className={current ? "course-group current" : "course-group"}>
      <Link
        className={onHome ? "course-option active" : "course-option"}
        href={`/courses/${course.id}`}
        aria-current={onHome ? "page" : undefined}
      >
        <strong>{course.code}</strong>
        <small>{course.name}</small>
      </Link>
      {current ? (
        <nav className="course-sections" aria-label={`${course.code} sections`}>
          {visible.map((section) => {
            const active = view === section.view;
            return (
              <Link
                key={section.view}
                className={active ? "section-link active" : "section-link"}
                href={section.href(course.id)}
                aria-current={active ? "page" : undefined}
              >
                {section.view === "participation" ? (studio ? "Class participation" : "My participation") : section.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

