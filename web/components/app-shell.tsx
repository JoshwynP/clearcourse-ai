import Link from "next/link";

type CourseView = "home" | "conversation" | "guidance" | "studio" | "participation" | "settings";

export type NavCourse = { id: string; code: string; name: string };

const sections: { view: Exclude<CourseView, "home">; label: string; href: (courseId: string) => string }[] = [
  { view: "conversation", label: "Discussion board", href: (courseId) => `/courses/${courseId}/conversation` },
  { view: "guidance", label: "AI cards", href: (courseId) => `/courses/${courseId}/guidance` },
  { view: "participation", label: "Participation", href: (courseId) => `/courses/${courseId}/participation` },
  { view: "studio", label: "Manage My Cards", href: (courseId) => `/courses/${courseId}/studio` },
  { view: "settings", label: "Course settings", href: (courseId) => `/courses/${courseId}/settings` },
];

export function AppShell({
  courses,
  course,
  view,
  crumb,
  studio = true,
  owner = false,
  participation = true,
  footer,
  children,
}: {
  courses: NavCourse[];
  course?: NavCourse;
  view?: CourseView;
  crumb?: string;
  studio?: boolean;
  owner?: boolean;
  participation?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const onHome = !course && !crumb;
  return (
    <div className="app-frame">
      <header className="masthead">
        <Link className="brand-link" href="/" aria-current={onHome ? "page" : undefined}>
          <strong>ClearCourse</strong>
          <small>Made by UW students for UW students and professors</small>
        </Link>
        <a className="uw-logo-link" href="https://uwaterloo.ca/" target="_blank" rel="noopener noreferrer" aria-label="University of Waterloo">
          <img src="/uwaterloo-logo.svg" alt="" width={170} height={41} />
        </a>
      </header>
      <div className="colour-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Course navigation">
          <div className="sidebar-section-label">Your courses</div>
          {courses.map((item) => (
            <CourseGroup
              key={item.id}
              course={item}
              current={item.id === course?.id}
              view={item.id === course?.id ? view : undefined}
              studio={studio}
              owner={owner}
              participation={participation}
            />
          ))}
          <div className="sidebar-foot">
            {footer ?? (
              <>
                ClearCourse
                <small>Made by UW students for UW students and professors</small>
              </>
            )}
          </div>
        </aside>
        <div className="main-content">
          <header className="topbar">
            <Breadcrumb course={course} view={view} crumb={crumb} studio={studio} />
          </header>
          <main id="main">{children}</main>
        </div>
      </div>
    </div>
  );
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

function Breadcrumb({ course, view, crumb, studio }: { course?: NavCourse; view?: CourseView; crumb?: string; studio: boolean }) {
  const section = sections.find((item) => item.view === view);
  return (
    <nav className="crumb" aria-label="Location">
      {course || crumb ? <Link href="/">Home</Link> : <strong>Home</strong>}
      {course ? (
        <>
          <span aria-hidden="true">/</span>
          {section ? <Link href={`/courses/${course.id}`}>{course.code}</Link> : <strong>{course.code}</strong>}
        </>
      ) : null}
      {section ? (
        <>
          <span aria-hidden="true">/</span>
          <strong>{section.view === "participation" ? (studio ? "Class participation" : "My participation") : section.label}</strong>
        </>
      ) : null}
      {!course && crumb ? (
        <>
          <span aria-hidden="true">/</span>
          <strong>{crumb}</strong>
        </>
      ) : null}
    </nav>
  );
}
