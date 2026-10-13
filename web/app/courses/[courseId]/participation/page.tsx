import { notFound, redirect } from "next/navigation";
import { SignedInShell } from "@/components/signed-in-shell";
import { changeParticipationSharing } from "@/lib/actions";
import { courseStaffRole, memberCourseForUser } from "@/lib/app-store";
import { currentAccount } from "@/lib/accounts";
import { privateParticipation, sharedParticipationForInstructor } from "@/lib/participation-store";

export default async function ParticipationPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const user = await currentAccount();
  if (!user) redirect("/sign-in");
  const course = await memberCourseForUser(user.id, courseId);
  if (!course) notFound();
  const staff = await courseStaffRole(user.id, courseId);
  if (staff === "ta") notFound();
  const teaching = Boolean(staff);
  const mine = teaching ? null : await privateParticipation(user.id, courseId);
  const shared = teaching ? await sharedParticipationForInstructor(user.id, courseId) : [];

  return <SignedInShell courseId={courseId} view="participation">
    <div className="page">
      <div className="page-head"><div>
        <h1>{teaching ? "Class participation" : "My participation"}</h1>
        <p className="page-subtitle">{course.code} · {course.name}</p>
      </div></div>
      {teaching ? <section className="panel panel-pad">
        <h2>Shared levels</h2>
        <p>Only students who chose to share appear here. Their questions, comments, and upvotes are not shown.</p>
        <p className="meta">Practice accounts only. Do not use this page for real student grading.</p>
        {shared.length ? <table className="card-table"><caption className="sr-only">Students who shared a contributor level</caption>
          <thead><tr><th scope="col">Student</th><th scope="col">Contributor level</th><th scope="col">When shared</th></tr></thead>
          <tbody>{shared.map((item, index) => <tr key={index}><td>{item.name}</td><td>{item.level}</td><td>{item.sharedAt.toLocaleDateString("en-CA")}</td></tr>)}</tbody>
        </table> : <p>No student has shared a contributor level.</p>}
      </section> : <div>
        <section className="panel panel-pad">
          <h2>This course</h2>
          <p>Questions asked, comments added, and upvotes given count. Views do not count.</p>
          <table className="card-table"><caption className="sr-only">Your private participation counts</caption><tbody>
            <tr><th scope="row">Questions asked</th><td>{mine?.questions ?? 0}</td></tr>
            <tr><th scope="row">Comments added</th><td>{mine?.comments ?? 0}</td></tr>
            <tr><th scope="row">Upvotes given</th><td>{mine?.upvotes ?? 0}</td></tr>
            <tr><th scope="row">Contributor level</th><td>{mine?.level ?? "No Record"}</td></tr>
          </tbody></table>
          <h3>How a level is reached</h3>
          <ul><li><strong>No Record:</strong> fewer than one question or comment, or no upvote yet.</li>
            <li><strong>Contributor:</strong> at least one question or comment and one upvote.</li>
            <li><strong>Sustained Contributor:</strong> at least two questions or comments and three upvotes.</li></ul>
        </section>
        <section className="panel panel-pad participation-share">
          <h2>Share my grade</h2>
          {mine?.sharedAt ? <><p>Your professor can see your contributor level. You can stop sharing.</p>
            <form action={changeParticipationSharing}><input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="shared" value="false" /><button className="button" type="submit">Stop sharing</button></form></>
          : <><p>Your grade is currently private and not shared with your professor.</p>
            <p>Your specific questions and engagement stay private in the course view. Your professor will only see your contributor level if you share it.</p>
            <form action={changeParticipationSharing}><input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="shared" value="true" /><button className="button primary" type="submit">Share my grade</button></form></>}
          <p className="meta">Practice accounts only. This release is not approved for real student participation or guaranteed anonymity.</p>
        </section>
      </div>}
    </div>
  </SignedInShell>;
}
