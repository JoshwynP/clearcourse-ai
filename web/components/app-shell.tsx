import Link from "next/link";
import { CourseNavigator } from "@/components/course-navigator";
import { WelcomeGuide } from "@/components/welcome-guide";

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
  welcomeRole,
  needsWelcome = false,
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
  welcomeRole?: "instructor" | "student";
  needsWelcome?: boolean;
  children: React.ReactNode;
}) {
  const onHome = !course && !crumb;
  return (
    <div className="app-frame">
      <header className="masthead">
        <Link className="brand-link" href="/" aria-current={onHome ? "page" : undefined}>
          <strong>ClearCourse</strong>
          <small>AI guidance, made clear</small>
        </Link>
        <div className="uw-credit">
          <img src="/uwaterloo-shield.svg" alt="" width={36} height={40} />
          <p><strong>UW</strong><span>Independent website made by students</span></p>
        </div>
      </header>
      <div className="colour-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="app-shell">
        <aside className="sidebar" aria-label="Course navigation">
          <CourseNavigator courses={courses} courseId={course?.id} view={view} studio={studio} owner={owner} participation={participation} />
          <div className="sidebar-foot">
            <div className="sidebar-account">
              {footer ?? (
                <div className="account-details">
                  <strong className="account-name">ClearCourse</strong>
                  <span className="account-role">Independent project for UW students and professors</span>
                </div>
              )}
            </div>
            <WelcomeGuide role={welcomeRole} needsWelcome={needsWelcome} />
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
