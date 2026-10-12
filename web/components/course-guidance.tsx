import { COURSE_PRINCIPLE, policyLinks } from "@/lib/sample-courses";
import type { CardFields } from "@/lib/identity-model";

export function CourseGuidance({ code, name, card }: { code: string; name: string; card: CardFields }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>AI guidance</h1>
          <p className="page-subtitle">
            {code} · {name}
          </p>
        </div>
      </div>
      <article className="panel panel-pad guidance-card">
        <h2>Course card</h2>
        <p>{card.summary || "No course summary yet."}</p>
        <h3>Generally allowed</h3>
        <p>{card.allowed || "Nothing listed yet."}</p>
        <h3>Generally prohibited</h3>
        <p>{card.notAllowed || "Nothing listed yet."}</p>
        <h3>Disclosure</h3>
        <p>{card.disclose || "Nothing listed yet."}</p>
        <p>{COURSE_PRINCIPLE}</p>
        <ul>
          {policyLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
