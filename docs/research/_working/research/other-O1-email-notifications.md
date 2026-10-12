# Branch O1 — Email delivery (Q6) and notifications (§7.13, Q13)

> **Research and planning only.** Nothing here is a requirement. Requirements are cited as §N.N of
> `P:/code/clearcourse-ai/CONTRIBUTING.md` (the source of truth). Every vendor, standard or policy fact
> carries a URL and was checked on 2026-10-11. Anything I could not verify on an official page is labelled
> **Unverified**. Anything that is my reasoning rather than a quoted fact is labelled **(inference)**.
> Recommendations are **proposals for the owner to approve**. No open question is closed here.

---

## 0. Summary

- **Every candidate provider stores something identity-bearing.** At minimum it holds the recipient address,
  the send time and the subject. Several also store the **full body** by default: Resend (30 days; turning
  this off is a $50/month add-on that needs Pro), Postmark (45 days), and Cloudflare's "Email preview" (about
  7 days, on by default for new domains). UW's own Exchange admins can also see sender, recipient and the first
  256 characters of the subject for up to 90 days (message trace). If UW licenses Defender for Office 365,
  Safe Links click logs also store the user's UPN and the **full clicked URL**.
  **So an email that carries question text, a typed subject ("Your question was answered") or a deep link
  (`/q/<id>`) puts identity plus content, or identity plus content ID, into third-party logs and dashboards.**
  §6.2 and §3 forbid that combination in our own logs, exports and dashboards, and the threat model must cover
  it for theirs (§6.2, Q8).
- **Proposed design:** keep all eight §7.13 notifications in-app, computed when the page is read (this matches
  privacy-A, item 7). Every email is **content-free and type-free**. It links only to a generic
  `/notifications` page. Activity-linked notifications (answer posted, followed question updated, question
  merged, participation level reached) go out by email only in **fixed-schedule digests**, never when the
  triggering action happens. That breaks the timing link (for example "Participation level reached" sent
  seconds after a post). Course-wide notices (card changed, survey available, sharing window open) are
  broadcasts that reveal nothing about anyone's anonymous activity.
- **Free tiers have caps that rule out email sign-in codes at class start:** Resend 100/day, Mailgun 100/day,
  MailerSend 500/month (with approval), Postmark 100/month. SendGrid now offers only a 60-day trial. Amazon
  SES has no free allowance but costs $0.10 per 1,000 (à la carte) and runs in **ca-central-1**. Cloudflare
  Email Sending exists but is **Beta**, needs Workers Paid ($5/month minimum), and includes 3,000 emails/month.
- **Recommendation (proposal):** **Amazon SES in ca-central-1**, à la carte, for both prototype and production,
  behind a small provider-neutral mail interface. Open and click tracking stay off (SES only tracks when you
  configure it). Resend Free is the documented fallback for development and demos. For production, also ask UW
  IST whether they would provide a sending path. Postmark is not proposed: it costs $15/month or more, keeps
  data in the US and stores content for 45 days by default.
- **Q13 (essential notifications):** options only (§4.7). Card changes affecting work underway (§7.6) and the
  sharing window (§7.10–7.11) are the strongest candidates. That is for the owner to decide.

---

## 1. Question(s) and what they block

| # | Question (§13, verbatim) | Blocks | Why this branch matters |
|---|---|---|---|
| **Q6** | "Email delivery provider for notifications." | §7.13 | §7.13 requires "Accessible **in-app and email** notifications". No email feature can be built until a provider is chosen. |
| **Q13** | "Which notifications are 'essential' (cannot be disabled)?" | §7.13 | §7.13: "Users can manage nonessential notifications". Q13 decides which preference toggles exist and what defaults are allowed. |
| Q4 (dependency) | "Authentication for the prototype…" | Sign-in | auth-A1 proposes **email one-time codes** as the always-available sign-in. If adopted, email becomes **critical infrastructure** for §10 "Institutional users can sign in securely". A provider outage or a daily cap then means nobody can sign in (§4.6). |
| Q2 (dependency) | Prototype milestone scope | Roadmap | The owner says the first milestone is "a public prototype that people can actually sign in to and use". If sign-in uses email, Q6 is on the milestone's critical path. |
| Q9 / Q8 (dependency) | Unjoinability mechanism / threat model | §6 | Notifications to followers or askers need *some* way to resolve "who follows question Q" (§6.3). Email adds third-party side channels that the threat model must list (§6.2: "The threat model and the limitations of anonymity must be documented"). |
| Q17 (dependency) | Retention and deletion | Data model | Provider log and body retention (1 to 45 days by default) is part of the system's real retention. |
| Q18 (dependency) | Sharing window and "end of course" | §7.10, §7.12 | Decides when "End-of-course survey available" and "Sharing window open" fire, and for whom. |
| Q15 / Q19 (dependency) | Accessibility target / i18n | §8, UI | §7.13 says notifications must be "Accessible". Email templates also need a language decision. |
| Q3 (dependency) | Stack and hosting | All code | Cloudflare Email Sending only makes sense if hosting is on Cloudflare Workers Paid. SES needs an AWS account. |

---

## 2. Options considered

### 2.1 Providers (facts from §3; checked 2026-10-11)

| Provider | Free tier now | Cheapest paid | Custom domain needed? | Where data is held | DPA | Logs / bodies kept | Open/click tracking default | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Amazon SES** | **None for SES itself.** New AWS customers get "up to $200 in AWS Free Tier credits" | À la carte **$0.10 / 1,000**. Plans: Essentials $0.16, Pro $0.22 + $105/mo, Enterprise $0.23 + $500/mo | Yes. A verified identity is needed for From/Return-Path. Sandbox allows only verified recipients, **200/24 h, 1/s** | You choose the region. **ca-central-1 and ca-west-1 exist** (ca-west-1 has no SMTP). Whether all processing stays in-region is **Unverified** | AWS Service Terms. SCCs "apply automatically" (GDPR Center). **Partly verified** | **No documented message-body store** (**Unverified**, no page says either way). Event records go to *your* destinations and include recipient, headers and subject. Open/click metrics are collected for 60 days **if enabled** | **Off unless configured.** Needs a configuration set with an open/click event destination. `ses:no-track` per link | **Proposed** for prototype and production. Cheapest; Canadian region; no body store documented. More setup (production access review, DNS, bounces) |
| **Resend** | **3,000/mo, 100/day**, 3 domains | Pro **$20/mo** (50,000, no daily limit) | **Yes.** `resend.dev` can only send to the account owner's address | **"All account data … is stored in the United States"**. Sending regions are us-east-1, eu-west-1, sa-east-1 and ap-northeast-1. No Canada | Yes, incorporated on acceptance (effective with the Agreement). SCCs and DPF. 90-day deletion after termination | "30-day data retention" on every self-serve plan. **Bodies stored by default.** Turning that off needs Pro/Scale for 1 month, >3,000 sent, <5% bounce, **$50/mo add-on** | **Off by default**, per domain | **Fallback / dev only.** Easiest developer experience. The 100/day cap breaks sign-in codes. Paid tier blows the budget. US storage with bodies kept |
| **Cloudflare Email Service (Email Sending)** | Outbound "Not available" on Workers Free (verified-destination sends only) | Workers Paid ($5/mo account minimum) includes **3,000/mo**, then **$0.35 / 1,000** | Yes. The domain must be "from your Cloudflare account". Records go on `cf-bounce.` | **Unverified** | **Unverified** (not fetched) | "Email preview" keeps HTML, text, headers and **raw source for about 7 days**. **On by default** for new sending domains (can be turned off per domain). Logs filterable up to 30 days | No tracking feature documented (**Unverified**) | **Watch / conditional.** Good value *only* if hosting is already on Workers Paid. **Beta**, with an unspecified "conservative daily quota" for new accounts. Not proposed for the sign-in path while in beta |
| **Postmark** | **100/month**, never expires | Basic **$15/mo** (10,000) | **Unverified** (presumably sender signature/domain) | **US** (Deft data centre near Chicago, plus AWS). "No plans to add servers in the EU" | Yes, incorporated in ToS since 27 Sep 2021 (page also has an older, conflicting line) | **"content and metadata for all emails for 45 days"**. Can be cut to 7 or 28 days only with a paid add-on (Pro+, from $5/mo) | Link tracking **off by default** ("None … is the default"). Open tracking default **Unverified** | **Not proposed.** Over budget. US only. Keeps content 45 days |
| **Mailgun (Sinch)** | **100/day**, 1 custom domain, 1-day logs, 1 user | Basic **$15/mo** (10,000) | Yes ("1 custom sending domain") | **US or EU** ("from a single account"). No Canada | Built into Sinch terms (superseded 2023 version viewed; current version not fetched) | Free and Basic: **1-day log retention**. Foundation: 5 days logs + 1 day message retention. Scale: 30 days logs + up to 7 days messages | **Unverified** | **Possible fallback.** Short retention is good for privacy, but 100/day breaks sign-in codes. EU/US only |
| **Twilio SendGrid** | **No permanent free plan found.** "Free trial lets you send 100 emails/day for 60 days" (some text still says "free plan") | Essentials "starting at $19.95/mo" | **Unverified** | "Twilio stores all Email Activity data in the United States". An EU data-residency row exists; which plans get it is unclear | **Unverified** (not fetched) | Email Activity: 3 days (trial, Essentials), 7 days (Pro). Up to 30 days with add-on. Subject is searchable | **Unverified** (docs only describe enabling) | **Not proposed.** No free tier, over budget |
| **MailerSend** | **500/month**, 100 daily requests, 1 domain, 1-day activity retention. **Approval and credit card required** | Hobby **$7/mo** (5,000) | Trial domain available before you add your own | "located in the European Union" (provider not named) | A DPA page is linked (not fetched) | Activity: Free/Hobby 1 day, Starter 7, Professional 30 | **Unverified** | **Not proposed.** Monthly cap too small; approval gate; logo implied on Free/Hobby ("Remove MailerSend logo" is a Starter feature) |
| **Brevo** | **Unverified.** Pricing and help pages could not be read (client-rendered; help centre returned 403) | **Unverified** | **Unverified** | **Unverified** | **Unverified** | **Unverified** | **Unverified** | **Not assessed.** Do not shortlist until someone verifies it by hand |
| *UW-provided sending path* (SMTP relay or a UW Microsoft 365 mailbox) | n/a | n/a | n/a | UW's own tenant | UW's own processor | UW's own logs | n/a | **Not researched; needs UW.** Possibly the best production answer for deliverability and data location. Proposed new open question NQ-O8 |

### 2.2 Notification channel designs (privacy options; analysed in §4)

| ID | Design | What third parties learn | Fits §7.13 literally? | Verdict |
|---|---|---|---|---|
| N0 | Rich per-event email (question text, deep link `/q/<id>`, typed subject) | Identity + anonymous text or content ID, with exact timing | Yes | **Reject.** It places identity + content into provider body storage, UW message trace (subject) and Safe Links click logs (URL). That is contrary to the intent of §3/§6.2 **(inference)** |
| N1 | Content-free per-event email sent immediately | Identity + notification type (if the subject is typed) + **exact time of the triggering action** | Yes | **Reject for activity-linked types.** Timing correlation (§4.3). Acceptable for course-wide broadcasts |
| N2 | Content-free, type-free **personal digest** at a fixed time, sent only to users with pending updates (privacy-A item 7) | Identity + "had *some* activity-linked update in window W" | Yes | **Viable.** Leaks recipient sets per window (§4.3, small classes) |
| N3 | **Course digest**: the same text sent to *every* opted-in member of a course on a fixed cadence, whether or not they personally have updates | Identity + enrolment + opt-in status only | Partly: notifies that "there are updates", not "your followed question was answered" | **Viable, strongest privacy.** Lower usefulness. Possible "attention" concern (§8). Owner decision |
| N4 | In-app only for activity-linked types; email only for course-wide broadcasts | Nothing about activity | **No.** §7.13 lists email for all eight | Spec deviation. Only with an owner decision (NQ-O1) |

---

## 3. Evidence

All URLs checked 2026-10-11. Quotes are from the page as fetched that day.

### 3.1 Amazon SES

- **Pricing** — https://aws.amazon.com/ses/pricing/ (checked 2026-10-11)
  - The page shows no SES-specific free email allowance. "new customers … will receive up to $200 in AWS Free
    Tier credits". "The free plan will be available for 6 months after account creation". "All Free Tier
    credits must be used within 12 months of your account creation date."
  - Outbound à la carte "$0.10 / 1,000 emails". New **pricing plans** (0–10M/month): Essentials $0.16, Pro
    $0.22, Enterprise $0.23 per 1,000. Monthly fees: Pro $105, Enterprise $500 per account per region.
  - "Accounts with no metered SES activity since June 1, 2025 will start on the Essentials plan beginning July
    21, 2026."
  - Attachments "$0.12 per GB". Standard dedicated IP "$24.95 / month / IP". VDM "$0.07/1,000 emails".
- **Plans vs à la carte** — https://docs.aws.amazon.com/ses/latest/dg/pricing-plans.html (checked 2026-10-11)
  - "If you do not have a plan, you are on à la carte pricing". "Cancel plan to return to à la carte pricing."
    "If you did not explicitly choose a plan and were defaulted to the Essentials plan, your first downgrade or
    cancellation to à la carte pricing also takes effect immediately." Plans are per account and per Region.
  - **(inference)** A brand-new account may start on Essentials. At prototype volumes the difference is cents,
    and the owner can cancel back to à la carte.
  - **Unverified:** whether SES production sending is available on the AWS *free* plan or needs the paid plan.
    Check this in spike E2.
- **Sandbox / production access** — https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html
  (checked 2026-10-11)
  - "The sandbox status for your account is unique per each AWS Region." In the sandbox you can only send "to
    verified email addresses and domains", "a maximum of 200 messages per 24-hour period", "a maximum of 1
    message per second".
  - The request asks you to choose Marketing or Transactional, give a website URL, and acknowledge that you have
    "a process in place for handling bounce and complaint notifications". "The AWS Support team provides an
    initial response to your request within 24 hours."
- **Quotas** — https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html (checked 2026-10-11)
  - The daily quota is a rolling 24-hour window. "Sending quotas are based on recipients rather than on
    messages." The page states **no initial production quota**, so the production quota is **Unverified**.
- **Regions** — https://docs.aws.amazon.com/general/latest/gr/ses.html (checked 2026-10-11)
  - API endpoints include "Canada (Central) ca-central-1" and "Canada West (Calgary) ca-west-1". SMTP endpoints
    are "not currently available in … Canada West (Calgary)". The ca-central-1 tracking domain is
    `r.ca-central-1.awstrack.me`.
- **Tracking** — https://docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html (checked 2026-10-11)
  - Open tracking needs you to "Create a configuration set", add an event destination for opens, and specify
    the set on each email. Ways to omit the pixel: "send the email without specifying a configuration set" or
    use a set "not configured to publish data about open events". Click tracking rewrites links; disable it per
    link with `ses:no-track` or per set by not capturing click events. "Opens and clicks are tracked at the
    recipient level." Metrics are collected "for 60 days after each email is sent."
- **Event payloads** — https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html
  (checked 2026-10-11)
  - The `mail` object contains `destination` ("recipients of the original mail"), `headers` and
    `commonHeaders`. The Click object contains `link` ("The URL of the link that the recipient clicked") and
    `ipAddress`. **(inference)** Any SES event we store is identity data and also carries our subject line.
- **Data protection** — https://docs.aws.amazon.com/ses/latest/dg/data-protection.html (checked 2026-10-11)
  - Advises against putting "your customers' email addresses, into tags or free-form text fields". "By
    default, Amazon SES uses opportunistic TLS", which can be changed to require TLS. The page says nothing
    about storing message bodies, so **body retention by SES is Unverified**.
- **AWS DPA** — https://aws.amazon.com/compliance/gdpr-center/ (checked 2026-10-11)
  - "the AWS DPA confirms that the SCCs will apply automatically". The UK addendum "is part of the AWS Service
    Terms and applies automatically for all customers who require a data processing agreement." Customers can
    "Determine where their customer data will be stored, including … geographic region".

### 3.2 Resend

- **Pricing** — https://resend.com/pricing (checked 2026-10-11)
  - Free "$0/mo", 3,000 emails/month. "The Free plan is limited to 100 emails per day." 3 domains.
    "30-day data retention".
  - Pro "$20/mo" for 50,000 (or "$35/mo" for 100,000), "No daily email limit", overage "$0.90" per 1,000 (must
    be enabled). Scale from "$90/mo". Dedicated IP "$30 / mo" (Scale, >3,000/day).
  - "Multi-region" is listed for all plans. "Each received email counts towards your transactional emails
    quota."
- **Regions** — https://resend.com/docs/dashboard/domains/regions.md (checked 2026-10-11)
  - us-east-1, eu-west-1, sa-east-1, ap-northeast-1. Region "controls where your emails are routed and sent
    from. It does not control where customer data is stored." "All account data, including email metadata,
    logs, and API records, is stored in the United States".
- **Content storage** —
  https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend.md (checked
  2026-10-11)
  - Resend "can turn off message content storage" only via support. Conditions: Pro or Scale "for at least 1
    month", "sending from a domain with an active website", "sent over 3,000 emails with a < 5% bounce rate".
    "This feature requires a $50/mo add-on." So bodies are stored by default **(inference from the wording)**.
- **Tracking** — https://resend.com/docs/dashboard/domains/tracking.md (checked 2026-10-11)
  - "Open and click tracking is disabled by default for all domains." A tracking subdomain "can only be
    changed, never removed."
- **Testing domain** — https://resend.com/docs/knowledge-base/403-error-resend-dev-domain.md (checked
  2026-10-11)
  - `resend.dev` "can only send emails to the email address associated with your Resend account". To send to
    other recipients "you need to add and verify your own domain".
- **Security** — https://resend.com/docs/security.md (checked 2026-10-11)
  - "SOC 2 Type II compliant". "All datastores are encrypted at rest". "Backups are persisted for 7 days."
- **DPA** — https://resend.com/legal/dpa (checked 2026-10-11; metadata "2025-12-31")
  - "shall become legally binding upon Customer entering into the Agreement". "Company's primary processing
    operations take place in the United States". EU SCCs and EU-U.S. DPF. Sub-processors listed at
    resend.com/legal/subprocessors with "fourteen (14) days" notice. "we delete their user/customer data within
    90 days of the account termination."

### 3.3 Cloudflare Email Service

- **Overview** — https://developers.cloudflare.com/email-service/ (checked 2026-10-11; "Last updated Oct 8, 2026")
  - "**Email Sending** Beta for outbound transactional emails", "Available on Workers Paid plan". Sending
    options: Workers `send_email` binding, REST API, SMTP `smtp.mx.cloudflare.net:465`.
- **Pricing** — https://developers.cloudflare.com/email-service/platform/pricing/ (checked 2026-10-11; updated
  Jun 9, 2026)
  - Workers Paid: "3,000 included per month, then $0.35 per 1,000 emails". "Sending to arbitrary recipients
    requires the Workers Paid plan."
- **Workers Paid minimum** — https://developers.cloudflare.com/workers/platform/pricing/ (checked 2026-10-11)
  - "a minimum charge of $5 USD per month for an account".
- **Limits** — https://developers.cloudflare.com/email-service/platform/limits/ (checked 2026-10-11)
  - "New accounts start with a conservative daily quota and scale up over time" (no figure given). 50
    recipients per email. 5 MiB per message. 30 domains per zone. Anti-spam compliance (CAN-SPAM, GDPR, CASL)
    is required.
- **Domains** — https://developers.cloudflare.com/email-service/configuration/domains/index.md (checked
  2026-10-11)
  - "Choose a domain from your Cloudflare account". Records go on a `cf-bounce.` subdomain (MX, SPF
    `v=spf1 include:_spf.mx.cloudflare.net ~all`, DKIM), plus DMARC on `_dmarc`. They "stay managed by Email
    Service". The example DMARC record is `p=reject`, while the guidance marks `p=none` as recommended for new
    setups, so the actual default is unclear.
- **Logs** — https://developers.cloudflare.com/email-service/observability/logs/index.md (checked 2026-10-11)
  - Email preview includes "HTML", "Text", "Headers" and "Raw: The full raw RFC 5322 message source". "New
    sending domains have Email preview turned on automatically." Previews "are retained for about seven days".
    Dashboard time range is up to 30 days.

### 3.4 Postmark

- **Pricing** — https://postmarkapp.com/pricing (checked 2026-10-11)
  - Free "100 emails/month", "No overages allowed in this plan", never expires.
  - Basic "$15.00/mo", Pro "$16.50/mo", Platform "$18.00/mo" at 10,000/month. Overage $1.80 / $1.30 / $1.20
    per 1,000.
  - Retention "45 Days". Pro/Platform "Customizable data retention up to 365 days (45-day default)"; add-on
    "Starts at $5/month", Pro or higher. "Statistics are always kept indefinitely."
- **Data location / DPA / retention** — https://postmarkapp.com/eu-privacy (checked 2026-10-11)
  - "hosted at Deft's data center (located outside of Chicago), and Amazon Web Services (AWS)". "We currently
    don't have plans to add servers in the EU."
  - "as of September 27, 2021, our updated Terms of Service incorporate our DPA". (An older line on the same
    page still asks you to sign.)
  - "Postmark collects and retains content and metadata for all emails for 45 days". The Retention Add-On lets
    you "purge all customer data after 7 or 28 days". Suppression lists are "stored indefinitely".
- **Link tracking** — https://postmarkapp.com/developer/user-guide/tracking-links (checked 2026-10-11)
  - "No links will be replaced or tracked. This is the default setting for all messages and new and existing
    servers." Per-link opt-out: `data-pm-no-track`.

### 3.5 Mailgun, SendGrid, MailerSend, Brevo

- **Mailgun pricing** — https://www.mailgun.com/pricing/ (checked 2026-10-11)
  - Free "100 emails/day included", "1 custom sending domain", "1 day log retention", 1 user. Basic from $15/mo
    (10,000), "No daily email limit".
  - Foundation $35/mo (50,000): 5 days logs, "1 day message retention". Scale $90/mo: 30 days logs, "Up to 7
    days message retention". "Send email through the US or the EU from a single account."
- **Mailgun DPA** — https://www.mailgun.com/legal/dpa/ (checked 2026-10-11)
  - This is a superseded version, "révisée pour la dernière fois le 16/01/2023". It is part of the Sinch Email
    terms; SCCs are incorporated. Sub-processors: Google Cloud (Germany and Belgium for EU customers, US for US
    customers) and AWS. Message content is "stockées sous une forme chiffrée". The current version was **not
    fetched**.
- **SendGrid pricing** — https://www.twilio.com/en-us/products/email-api/pricing (checked 2026-10-11;
  sendgrid.com/en-us/pricing returns 301 to twilio.com)
  - "**Free trial** lets you send 100 emails/day for 60 days". Elsewhere the page still says "Start with our
    free plan", so the wording is inconsistent. Essentials "starting at $19.95/mo", Pro "starting at
    $89.95/mo". Email Activity: Free Trial and Essentials "3 days", Pro "7 days".
- **SendGrid activity feed** — https://www.twilio.com/docs/sendgrid/ui/analytics-and-reporting/email-activity-feed
  (checked 2026-10-11; updated 2026-01-22)
  - "Twilio stores all Email Activity data in the United States". You can filter by "Subject" and "To Email".
    The add-on extends retention "up to 30 days".
- **SendGrid tracking** — https://www.twilio.com/docs/sendgrid/ui/account-and-settings/tracking (checked
  2026-10-11; updated 2026-03-12)
  - The page describes only how to enable tracking. **The default is Unverified.**
- **MailerSend pricing** — https://www.mailersend.com/pricing (checked 2026-10-11)
  - Free "500 emails /month", "100 daily requests", 1 domain, activity retention "1 day". "Once your account is
    approved, you can subscribe to a Free plan". A card is required. Hobby "$7.00 /month" for 5,000.
    "Remove MailerSend logo" is a Starter feature.
- **MailerSend security** — https://www.mailersend.com/security (checked 2026-10-11)
  - "hosted by a trusted and certified data storage center that is located in the European Union". DPA at
    /legal/data-processing-addendum (not fetched).
- **Brevo** — https://www.brevo.com/pricing/, https://www.brevo.com/products/transactional-email/,
  https://www.brevo.com/free-smtp-server/, https://www.brevo.com/legal/termsofuse/ (all checked 2026-10-11)
  - Only page titles came back (client-rendered). help.brevo.com returned HTTP 403.
  - https://developers.brevo.com/docs/api-limits gives API rate limits only (`POST /v3/smtp/email` "1,000 RPS"
    on the general tier, all plans).
  - Re-tried in a second pass (checked 2026-10-11): https://www.brevo.com/pricing/ and https://www.brevo.com/gdpr/
    again returned only page titles; https://developers.brevo.com/docs/getting-started states no free-plan cap,
    branding or hosting location.
  - **The free-plan cap, branding, data location, DPA and retention are all Unverified.** The owner (or a human
    with a browser) should read the Brevo pricing and DPA pages before Brevo is considered.

### 3.6 Receiving side: UW, Microsoft 365, Gmail

- **UW mail platform** — https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/269156660/Microsoft+365+email
  (checked 2026-10-11; "Updated Jun 23, 2025")
  - "Outlook email accounts are provided to employees, students, alumni, retirees, and for generic accounts."
    The page does not say whether UW uses Safe Links or Defender for Office 365, so that is **Unverified**.
- **Microsoft 365 inbound authentication** —
  https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about (checked 2026-10-11; ms.date
  2026-07-03)
  - Microsoft 365 uses "implicit email authentication" (sender reputation, history, behavioural analysis) and a
    `compauth` result. "a composite authentication failure doesn't directly result in a message being blocked."
  - "SPF breaks after messages encounter server-based email forwarding". DKIM "can validate messages that fail
    SPF" when mail is forwarded.
  - "Delivery to Microsoft isn't guaranteed, even if you authenticate email … But, email authentication ensures
    that Microsoft doesn't automatically junk email from your customer domains simply because it isn't
    authenticated."
- **Outlook.com high-volume senders** — https://substrate.office.com/ip-domain-management-snds/postmaster
  (checked 2026-10-11; sendersupport.olc.protection.outlook.com/pm/ returns 308 here)
  - "Starting May 5th, 2025, Outlook.com is enforcing stricter email authentication standards (SPF, DKIM,
    DMARC)" for "domains sending over 5,000 emails per day". Non-compliant mail goes to "junk folder";
    "Shortly we will reject".
  - The page names only Outlook.com and does not say whether Microsoft 365 tenants are covered. The linked
    techcommunity blog with the detailed rules returned only its title, so the **detailed DMARC/alignment rules
    are Unverified**.
  - **(inference)** At ClearCourse volumes (well under 5,000/day) the threshold does not apply, but the same
    records should be published anyway.
- **Exchange Online message trace** —
  https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac (checked
  2026-10-11; updated 2026-10-05)
  - The summary report shows Date, Sender, Recipient, "Subject: The first 256 characters of the message's
    Subject: field" and Status. You can "query up to 90 days of historical data".
  - Access needs Organization Management, Exchange Administrator or Global Administrator.
- **Safe Links** — https://learn.microsoft.com/en-us/defender-office-365/safe-links-about (checked 2026-10-11;
  ms.date 2026-05-22)
  - "URLs are scanned prior to message delivery". "URLs that don't have a valid reputation are detonated
    asynchronously in the background." "Wait for URL scanning to complete before delivering the message" is
    "the recommended value". Rewriting is "per message recipient".
  - "Track user clicks: Turn on or turn off storing Safe Links click data for URLs clicked. We recommend that
    you leave this setting selected (on)." It applies to organisations with Defender for Office 365; the
    "Built-in protection" preset applies when there is "at least one Defender for Office 365 license".
- **Click log contents** — https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-urlclickevents-table
  (checked 2026-10-11; ms.date 2026-06-04)
  - Columns include `Url` ("The full URL that was clicked on by the user"), `AccountUpn`, `Timestamp`,
    `IPAddress` and `NetworkMessageId`.
- **Gmail sender guidelines** — https://support.google.com/a/answer/81126 (checked 2026-10-11)
  - All senders: "SPF or DKIM", TLS, valid PTR, spam rate "below 0.3%". Bulk (more than 5,000/day to Gmail
    accounts): SPF **and** DKIM, DMARC ("can be set to none"), From alignment, one-click unsubscribe for
    "Marketing messages and subscribed messages". DKIM "1024 bits or longer".
- **Gmail FAQ** — https://support.google.com/a/answer/14229414 (checked 2026-10-11)
  - "Transactional messages are excluded from this requirement" (one-click unsubscribe). Examples: "password
    reset messages, reservation confirmations, and form submission confirmations".
  - Bulk status is permanent once reached. Messages from subdomains count toward the primary domain. "Message
    recipients, not Google, determine the nature of the messages they receive."
  - The guidelines cover personal Gmail accounts, not Google Workspace. **(inference)** This matters only for
    UW users who forward mail to personal Gmail. auth-A1 cites a UW KB page about external routing.

### 3.7 Standards and law

- **DMARC** — https://datatracker.ietf.org/doc/draft-ietf-dmarc-dmarcbis/ (checked 2026-10-11)
  - DMARCbis is now **RFC 9989**, "RFC - Proposed Standard (May 2026)". It "obsoletes RFCs 7489 and 9091".
    Reporting is in RFC 9990 and RFC 9991.
- **One-click unsubscribe** — https://www.rfc-editor.org/info/rfc8058 (checked 2026-10-11)
  - RFC 8058, Proposed Standard, January 2017. The receiver unsubscribes by an HTTPS **POST**
    (`List-Unsubscribe=One-Click`). It needs a DKIM signature that covers both headers.
  - **(inference)** Because it uses POST, a link scanner that GETs the URL does not unsubscribe anyone.
- **CASL** — https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html and
  https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html (checked 2026-10-11; "current to 2026-09-21")
  - s.6(1) prohibits sending a *commercial* electronic message (CEM) without (a) consent and (b) the form set
    by s.6(2): sender identification, contact details and an unsubscribe mechanism.
  - s.6(6)(d) exempts messages that solely provide "notification of factual information about" an ongoing
    subscription, membership or account from **paragraph (1)(a) only**. Form requirements still apply.
  - s.11(1): unsubscribe must take effect "no later than 10 business days". s.12(1): CASL applies if "a
    computer system located in Canada is used to send or access" the message.
  - **Whether ClearCourse notifications are CEMs at all is a legal question** (NQ-O9). I make no claim.

---

## 4. Privacy implications (§6)

### 4.1 Requirements this analysis relies on

- §6.2: "Identity-bearing information and anonymous-content text must not appear together in any application
  log, analytics event, error report, database view, export or administrator dashboard." This is restated as a
  hard prohibition in §3.
- §6.2: "ordinary application queries must not be able to join the action content back to the student's
  identity"; "opaque identifiers"; "The threat model and the limitations of anonymity must be documented."
- §6.1: five separated domains. Domain 2, the private per-student counters, is private: §7.10 says "Students
  privately see … Current level".
- §6.3: the system must know *somewhere* who acted, without giving ordinary queries a usable mapping.
- §7.13: "Accessible in-app and email notifications" for eight events; "Users can manage nonessential
  notifications."
- §9: negative tests proving instructors and TAs cannot retrieve authors "through the UI, API, exports, logs or
  predictable identifiers".
- §8: avoid "attention-maximizing patterns".

### 4.2 Who sees what when we send one email

| Party | What it sees | Retention (verified figures) | Can we control it? |
|---|---|---|---|
| Email provider | Recipient address, From, subject, send time, often the **full body** | Resend 30 days (bodies); Postmark 45 days (content); Cloudflare preview ~7 days (on by default); Mailgun Free 1 day (logs); SendGrid 3 days (activity); SES: event metrics 60 days if tracking is enabled; body storage Unverified | Partly. Choose provider and settings; keep bodies content-free |
| UW Exchange admins | Sender, recipient, **first 256 characters of the subject**, date, status | Message trace up to **90 days** | No. Only by keeping subjects constant |
| UW security admins (only if Defender for Office 365 is licensed; Unverified for UW) | **AccountUpn + full clicked URL + time + IP** (`UrlClickEvents`); URLs detonated before delivery | Not on the pages fetched (**Unverified**) | No. Only by using generic URLs |
| Mailbox content (UW tenant, and any forwarding target such as Gmail) | Full message | Mailbox lifetime; eDiscovery scope **Unverified** | No. Only by keeping bodies content-free |
| Our own system | Outbox rows, provider webhooks/events (recipient + headers + subject + clicked link if tracking were on), error reports | Ours (Q17) | Yes. Design rules in §5.4 |
| Network path | Opportunistic TLS by default (SES) | n/a | Partly. SES can require TLS per configuration set |

**(inference)** The prohibition in §6.2 is written about *our* logs, exports and dashboards. But an email we
send creates records in other people's logs and dashboards (the provider's dashboard, UW's message trace, UW's
Defender portal) that combine identity with whatever we put in the message. The only control we have is what
the message contains and when it is sent. So the content and timing rules below are needed to honour the
intent of §6.2. The residual exposure must be written into the threat model (Q8).

### 4.3 Leak vectors by notification type

The privacy class of each §7.13 notification:

| §7.13 notification | Who receives it (spec / proposal) | Class | What a per-event email would reveal to third parties |
|---|---|---|---|
| Course card changed | Affected students (§7.6); proposal: all enrolled | **Broadcast** | Only enrolment |
| Assignment card changed | Affected students (§7.6) | **Broadcast** (unless "affected" is narrower; NQ-O5) | Only enrolment |
| End-of-course survey available | Not specified; proposal: all enrolled (Q18) | **Broadcast** | Only enrolment |
| Sharing window open | Not specified; proposal: all enrolled (Q18) | **Broadcast** | Only enrolment |
| Answer posted | Not specified: asker, followers or both (privacy-A NQ-A1) | **Activity-linked** | "Student X asked or follows a question answered at time T". The board shows which question was answered at T, so X is linked to that question, and maybe to its authorship |
| Followed question updated | Followers | **Activity-linked** | "X follows a question updated at T" |
| Question merged | Not specified; proposal: followers or author of the merged-away question | **Activity-linked** | "X is linked to the question merged at T". Merges are moderator actions visible on the board |
| Participation level reached | The student | **Self-activity + private counter (§6.1 domain 2)** | "X just crossed a threshold", sent seconds after X's post, upvote or comment. Since board content carries timestamps, this **links X to the specific post**. It also leaks X's private level (§7.10) if the type is in the subject or body |

**Worked example of the timing leak (inference).** A student posts a comment at 14:03:12. The counter crosses
the Contributor threshold. An immediate email goes out at 14:03:15. The provider log, and UW message trace, now
hold `(alice@uwaterloo.ca, 14:03:15, <subject>)`. The board shows a comment created at about 14:03. Anyone who
sees both (provider staff, UW Exchange admins, or a compelled disclosure) can link Alice to that comment. This
holds **even if the email is content-free** ("You have an update"), because the send time itself carries the
signal.

**Other vectors:**

1. **Body text.** Question text in a body sits in provider storage (Resend 30 d, Postmark 45 d, Cloudflare
   preview ~7 d) and in the mailbox. This is identity + anonymous content in one record. It is design N0 and
   is rejected.
2. **Subject line.** "Your question was answered" in UW message trace (90 days, 256 characters) tells Exchange
   admins that X asked or follows something. "Participation level reached" leaks private counter information.
   **The subject must be constant across all types (proposal).**
3. **Deep link.** `/q/<id>` gives identity + content ID in the provider body, in Safe Links click logs
   (`AccountUpn` + full `Url`) and in our own web server logs, correlated with the email. **Use a generic
   `/notifications` link (proposal, matching privacy-A).**
4. **Provider tracking.** An open pixel or click redirect adds per-recipient open and click events. SES Click
   events include the full `link`. Resend, Postmark and SES all have tracking off unless configured; SendGrid,
   Mailgun and MailerSend defaults are **Unverified**. **Tracking must stay off (proposal).**
5. **Recipient set per window.** Even with design N2 (personal digest, fixed time), the set of students who
   got a digest on day D is visible to the provider and UW. In a small course where one question was answered
   on day D, that set is roughly that question's followers (**inference**). Over a term the provider could
   build a per-student "had activity-linked updates on day D" series. That is close in spirit to the §3 ban on
   "Student behavioral timelines", though built by a third party. Design N3 (one course digest to all opted-in
   members) removes this.
6. **Template key in our own outbox.** A row `(user_id, template='answer_posted')` is identity + activity
   signal in our database. **Proposal:** a single `activity_digest` key, rows deleted after sending (§5.4).
7. **Webhooks and errors.** Delivery and bounce events contain recipient and headers (SES `mail.destination`,
   `commonHeaders`). If request bodies or rendered emails are logged on error, identity sits next to whatever
   the body holds. Content-free bodies make this harmless. The webhook handler should still store only status
   fields.
8. **Sign-in code emails (if Q4 picks email OTP).** Each code email records "X requested a sign-in at T" with
   the provider and in UW message trace. Posts made minutes later can be correlated **(inference)**. The same
   side channel through auth and host logs is already in privacy-A's threat table. Mitigations sit outside this
   branch: longer sessions (auth-A1 cites the NIST 30-day cap at AAL1), coarse content timestamps (privacy-A),
   and passkeys after first sign-in (auth-A1).

### 4.4 Mitigations evaluated

| Mitigation | Removes | Leaves | Cost / trade-off |
|---|---|---|---|
| **Content-free body** (generic line + generic link + preferences/unsubscribe links) | Vectors 1 and 3 | Timing, recipient set | Less useful email. Copy text is owner-authored (NQ-O6) |
| **Constant, type-free subject** | Vector 2 | — | Users cannot triage by subject |
| **Generic `/notifications` link** (never `/q/<id>`, no notification id in the URL) | Vector 3 | — | One more click. If a per-email opaque token is used for sign-in convenience, it must not encode the notification. **Proposal:** no token at all; the user signs in normally |
| **Tracking off** (open and click) | Vector 4 | — | No engagement metrics. That is consistent with §8 and §7.16 (aggregates only) **(inference)** |
| **Fixed-schedule personal digest (N2)** | Exact timing (vector "timing") | Day-level recipient sets (vector 5) | Delay up to one cadence period. Cadence is an owner decision (NQ-O12) |
| **Course digest to all opted-in members (N3)** | Timing and recipient sets | Enrolment + opt-in only | Least useful ("there may be updates"). Sending email to people with nothing new may count as an attention pattern (§8). Owner decision |
| **Small-class suppression**: hold an activity digest until at least k recipients in the course share a window | Most of vector 5 | Delay; k is a new threshold, like Q16 | Must not be invented. NQ-O11 |
| **In-app only for activity-linked types (N4)** | All email vectors for those types | — | Conflicts with the literal §7.13 list. NQ-O1 |
| **Short provider retention** | Shrinks the window of vectors 1 to 5 | — | Only Mailgun (1 day on Free) and Postmark (paid add-on) offer short or adjustable retention. SES is opt-in for metrics |
| **Provider with no body store** | Vector 1 even if a template mistake leaks content | — | SES (none documented), or Cloudflare with preview turned off |
| **Require TLS** (SES configuration set) | Plaintext transit | Bounce if the receiver lacks TLS | Low **(inference)**. Microsoft 365 and Gmail support TLS; Gmail requires it for senders |

### 4.5 Residual limitations to document in the threat model (Q8)

These hold even with every proposal in §5 (**inference**):

- The provider and UW mail admins learn **who is enrolled** in ClearCourse (and in which course, if the course
  code is included; NQ-O6), and when each person got a digest or a sign-in code.
- With N2, they learn day-level "had an activity-linked update" signals. In small classes these can narrow
  who follows or authored a question.
- With email sign-in codes, they learn sign-in times. These can be correlated with board timestamps unless
  the board coarsens them.
- Anyone with access to a student's mailbox learns that the student uses ClearCourse and when.
- A compelled disclosure from the provider yields the same.

### 4.6 If sign-in uses email codes or magic links: email is critical infrastructure

| Risk | Evidence | Proposal |
|---|---|---|
| **Daily caps lock people out** | Resend Free "limited to 100 emails per day"; Mailgun Free "100 emails/day"; MailerSend "100 daily requests"; SES sandbox 200/24 h; Cloudflare "conservative daily quota" for new accounts | Do not put a 100/day provider on the sign-in path for any class larger than the cap. SES with production access (request it early, spike E2) |
| **Link scanners use up single-use links** | Safe Links detonates links without reputation (§3.6). auth-A1: Better Auth magic-link verify is a `GET` | Use typed 6-digit codes, not clickable magic links (agrees with auth-A1). Put no URL in the code email **(inference)** |
| **Delivery delay vs code expiry** | Safe Links "Wait for URL scanning … before delivering" is "the recommended value". auth-A1: OTP `expiresIn` 300 s | A URL-free code email avoids URL-scan holds **(inference)**. Measure real delay to a UW mailbox (spike E1) |
| **Provider dashboard exposes live codes** | Resend stores bodies 30 days; Postmark 45 days; Cloudflare preview ~7 days | **(inference)** Anyone with provider-dashboard access during the 5-minute validity can take over accounts. Use MFA on the provider account. Prefer a provider with no body store (SES) or turn off Cloudflare preview. Better Auth `storeOTP: "hashed"` (auth-A1) protects the database copy, not the email |
| **Provider outage = nobody can sign in** | Single provider | Optional second provider as fallback (NQ-O13). This adds a second processor. Passkeys after first sign-in reduce the dependency (auth-A1) |
| **Deliverability to UW** | Microsoft 365 uses implicit authentication. "Delivery to Microsoft isn't guaranteed" | Aligned SPF + DKIM; DMARC (RFC 9989) starting at `p=none` with reporting, then tighten; a dedicated sending subdomain **(inference)**; no tracking or shortened links; a plain-text part. Ask UW IST about allow-listing for production (NQ-O8) |

### 4.7 Q13 — which notifications could be essential (options only; no recommendation)

**Requirement context:** §7.13 "Users can manage nonessential notifications". §7.6 "If a published rule changes,
the instructor must specify: what changed · why it changed · effective date · whether the change applies to work
already underway. Affected students are notified." Q13 could be answered with "none". A sub-question the owner
must also answer: does "essential" apply per channel (in-app vs email)? See NQ-O4.

| Notification | Arguments for "essential" | Arguments against | Options for the owner |
|---|---|---|---|
| **Assignment card changed** | §7.6 makes notifying affected students mandatory for published rule changes, and asks whether the change "applies to work already underway". Missing a rule change could disadvantage a student | Editorial edits (resource links, typos) may also count as "changes" and become noise (NQ-O5) | (a) Always essential. (b) Essential only for published *rule* changes. (c) Essential only when the instructor marks "applies to work already underway". (d) Essential in-app, email user-controlled. (e) Nonessential |
| **Course card changed** | Same §7.6 logic. Course rules are the default for every assignment (§7.4 overrides) | Same noise risk | Same as above |
| **Sharing window open** | Time-bound. Revocation lasts only until export (§7.10). If participation is graded (§7.11), missing the window could cost credit | §7.10/§10: "Students alone decide whether to share". A non-disableable or repeated notice could feel like pressure. Copy must stay neutral (owner text) | (a) Essential single notice. (b) Essential notice + one reminder before close (Q18). (c) Essential in-app only. (d) Nonessential |
| **End-of-course survey available** | Time-bound. Presented "before participation-level sharing" (§7.12) | Survey earns "no participation credit" (§7.12) and is optional. Forcing it may feel pushy (§8) | (a) Nonessential. (b) Essential single notice. (c) Essential in-app only |
| **Answer posted** | The asker wants the answer | Activity-linked privacy class (§4.3). The recipient definition is open (privacy-A NQ-A1) | (a) Nonessential. (b) Essential in-app only (email stays digest and opt-out) |
| **Followed question updated** | — | Follow is voluntary (§7.7); activity-linked | (a) Nonessential. (b) Essential in-app only |
| **Question merged** | Merges change where the conversation lives | Old links redirect (§7.7), so harm is low; activity-linked | (a) Nonessential. (b) Essential in-app only |
| **Participation level reached** | Lets students track a graded level (§7.11) | Level is always visible privately in-app (§7.10). Private counter data. A "level reached" message risks a gamified feel (§8 forbids badges and streaks) | (a) Nonessential. (b) In-app only (needs NQ-O1). (c) Email digest opt-in only |

Out of §7.13 scope but related (**proposal for classification, not a requirement**): sign-in code emails are
authentication messages, not notifications, so preferences cannot apply to them. Any future deanonymization
"notification rules" (§6.4) are a separate, institution-configured process that exists only if deanonymization
is ever enabled.

---

## 5. Recommendation (PROPOSAL — for the owner to approve; not a decision)

### 5.1 Provider for the prototype

**Proposal: Amazon SES, region ca-central-1, à la carte pricing, transactional mail type**, behind a small
internal `Mailer` interface (one adapter per provider; templates rendered in our app).

Why:

- **Cost.** $0.10 per 1,000. Even 20,000 emails/month costs about $2 (§5.6). That fits the owner's
  "<$5/month" target, and new accounts get up to $200 in credits.
- **No daily cap after production access** (the sandbox's 200/day applies only before approval). This matters
  if Q4 picks email codes.
- **Privacy.** No documented body store. Tracking is opt-in, so it is off unless we build it. The region is in
  Canada, which keeps the production option open for a UW privacy review (NQ-O7). The claim that all
  processing stays in-region is **Unverified**.
- **Mainstream and well documented**, and it fits the owner's preference for managed services.

Honest costs:

- More setup than Resend: an AWS account, domain verification, a production-access request (initial response
  "within 24 hours"; it needs a live website), and bounce/complaint handling (required by the acknowledgement).
- Whether the AWS free plan permits SES production sending is **Unverified** (spike E2).
- The Essentials-plan default may apply to a new account (cancel to à la carte).

**Fallback / development: Resend Free.** Use it for local and dev sends and demos below 100/day, accepting US
storage and 30-day body retention. This is safe only because templates are content-free. If SES production
access is refused or delayed, Resend Free can carry a small pilot, **as long as sign-in does not depend on
email for more than 100 people/day**.

**Conditional alternative: Cloudflare Email Sending.** Only if the hosting branch chooses Cloudflare Workers
Paid. The marginal cost is $0 up to 3,000/month. It is **Beta**, has an unspecified new-account daily quota,
needs the domain in the Cloudflare account, and has Email preview on by default (turn it off). It is not
proposed for the sign-in path until it leaves beta and the quota is known.

### 5.2 Provider for production

- **Proposal:** stay on **SES ca-central-1**. The interface makes a switch cheap if needed.
- **Also ask UW IST (NQ-O8)** whether a UW-sanctioned sending path exists (relay, tenant mailbox, or
  allow-listing). If UW offers one, it may be better for deliverability to UW mailboxes and for data location,
  and should be compared then.
- Postmark, SendGrid and Mailgun paid tiers ($15–$20/month and up) are not proposed. They exceed the budget
  and offer no privacy advantage over SES. Postmark and SendGrid keep data in the US; Postmark keeps content
  45 days by default.

### 5.3 Notification design (proposal)

1. **In-app for all eight §7.13 types**, computed on read, as privacy-A item 7 proposes. No per-user
   notification row stores a question id. In-app notices must meet the accessibility target (Q15). Unread
   indicators should be calm and non-gamified (§8); exact UI is a design decision.
2. **Course-wide broadcasts by email** (both card-changed types, survey available, sharing window open). Send
   per event or batch; either is privacy-neutral because the recipient set is the whole course.
3. **Activity-linked types by email only as a fixed-schedule digest.** The owner chooses N2 (personal) or N3
   (course-wide). Cadence and send time are owner decisions (NQ-O12). Never send at action time. Optionally
   suppress small classes (NQ-O11). If the owner prefers N4 (in-app only), that needs NQ-O1.
4. **Every email:** constant subject; content-free body; generic `/notifications` link; no recipient name; no
   question title, text or id; no level; tracking off; plain-text part included. All copy is owner-authored
   (NQ-O6).
5. **Nonessential emails** carry a preferences link and RFC 8058 one-click unsubscribe (POST, so scanners
   cannot trigger it). The unsubscribe token identifies only the user and the preference category, never
   content (**inference**). Whether CASL makes this mandatory is NQ-O9.

### 5.4 Configuration and coding rules (proposal; illustrative)

```
notify.email_outbox
  id          uuid v4                       -- never sequential (CLAUDE.md privacy rules)
  user_id     uuid                          -- identity domain reference
  template    enum('course_broadcast','activity_digest','auth_code')   -- ONE key for all activity-linked types
  course_id   uuid null                     -- only for course_broadcast; owner decides if digests name a course
  slot        timestamptz                   -- fixed digest slot, not action time
  status      enum('queued','sent','failed')
-- Row deleted after send (retention per Q17). No body, subject, question id or provider payload stored.
```

- **SES:** use a configuration set with a TLS policy "Require" and an event destination for **Bounce,
  Complaint, Reject and DeliveryDelay only**, with **no Open or Click events**. Add `ses:no-track` defensively
  on links. Store only `{status, bounceType, timestamp}`. Never log the full event or the rendered body.
- **Resend (fallback):** confirm open and click tracking stay disabled per domain (default off). Never create a
  tracking subdomain, since one "can only be changed, never removed".
- **Cloudflare (if used):** turn off "Email preview" on every sending domain.
- **DNS:** a dedicated sending subdomain (**inference**); aligned SPF + DKIM (2048-bit if the provider allows;
  Gmail needs at least 1024); DMARC per RFC 9989, starting at `p=none` with aggregate reporting, then tighten.
- **Tests (§9):** negative tests that rendered email templates contain no content text, content id or level.
  Tests that the outbox schema has no content columns. Log-scrubbing tests for webhook handlers.

### 5.5 Cheap spikes before deciding ($0, owner-run)

- **E1 — Deliverability and Safe Links check.** Send one SES email and one Resend email to a UW mailbox the
  owner controls. Read the headers: `Authentication-Results` / `compauth`, inbox or junk placement, delivery
  delay. Check whether a link is rewritten to `*.safelinks.protection.outlook.com`. That shows whether UW
  runs Safe Links, which this branch could not verify.
- **E2 — SES account.** Create the account. Check the plan state (free/paid, Essentials vs à la carte). Request
  production access in ca-central-1 with a live privacy page. Record the granted quota (**Unverified** today).
- **E3 — Tracking check.** Inspect raw received messages from each provider: no 1×1 pixel and no rewritten
  links.

### 5.6 Cost scenarios (USD/month, parametric; the owner gave no user counts)

Volumes are **illustrative**, not requirements. Peak/day matters because sign-in codes cluster at class start.

| Provider | A: 1,000/mo, peak 60/day | B: 5,000/mo, peak 300/day | C: 20,000/mo, peak 1,000/day |
|---|---|---|---|
| SES à la carte (Essentials) | $0.10 ($0.16) | $0.50 ($0.80) | $2.00 ($3.20) |
| Resend | $0 (Free) | **$20** (Pro; Free fails both caps) | $20 (Pro) |
| Cloudflare (Workers Paid already used for hosting) | $0 marginal | ≈$0.70 marginal (2,000 × $0.35/1,000). New-account daily quota may block | ≈$5.95 marginal |
| Cloudflare (no other Workers use) | $5 | ≈$5.70 | ≈$10.95 |
| Mailgun | $0 (Free) | $15 (Basic; Free fails 100/day) | ≈$33 (Basic 10k + 10k × $1.80/1,000) or $35 Foundation |
| Postmark | $15 (free = 100/mo) | $15 | ≈$33 Basic (10k + overage); slider tiers not captured, **Unverified** |
| MailerSend | $7 (Hobby; Free 500/mo too small) | $7 (Hobby 5,000; Hobby daily limit **Unverified**) | Starter price not captured, **Unverified** |
| SendGrid | Trial only, then from $19.95 | From $19.95 (volume mapping **Unverified**) | **Unverified** |

All options also need a domain. Its cost belongs to the hosting branch and is not verified here.

---

## 6. Dependencies and proposed new open questions

### 6.1 Dependencies on other branches and questions

- **Q4 / auth-A1:** if "Sign in with Microsoft" works (spike S1), email volume drops to notifications only, and
  Resend Free may suffice for a prototype. If email codes are the main method, the SES proposal is close to
  mandatory.
- **Q3 / hosting:** Cloudflare Email is only attractive with Workers Paid. SES needs an AWS account whatever
  the host.
- **Q9 / privacy-A:** follower resolution (HMAC follow tags, compute-on-read) and NQ-A1 (asker vs followers)
  and NQ-A13 (auto-follow) decide who receives activity-linked notices.
- **Q8:** add §4.5 to the threat model.
- **Q13:** §4.7 options.
- **Q16:** a possible k for small-class suppression (NQ-O11).
- **Q17:** provider retention.
- **Q18:** survey and sharing timing.
- **Q15:** accessible email and in-app notices.
- **Q19:** template languages.

### 6.2 Proposed new open questions (for §13; not resolved here)

| # | Proposed question | Why it matters |
|---|---|---|
| NQ-O1 | Does §7.13 require an **email** channel for all eight types, or may activity-linked types (answer posted, followed question updated, question merged, participation level reached) be in-app only, or email only as a digest? | Design N4 vs N2/N3; privacy (§4.3) |
| NQ-O2 | What is the **default** on/off state per notification and per channel? (§7.13 says users can manage them but gives no defaults) | Preference UI; privacy defaults |
| NQ-O3 | What counts as "Followed question updated": new answer, comment, edit, resolve/reopen, pin, recategorise, merge? (Asker vs followers for "Answer posted" is already privacy-A NQ-A1) | Fan-out rules |
| NQ-O4 | Does "essential" (Q13) apply per channel (in-app vs email) or to both? | Q13 answer shape |
| NQ-O5 | Which card edits trigger "card changed": only published **rule** changes (§7.6), or any edit to a published card? Who are "affected students": all enrolled, or a subset? | Notification volume; Q13 |
| NQ-O6 | Owner-approved copy for every template (subject, body, footer). May an email name the institution or the course code? | Copy must not be invented (CLAUDE.md). Course code reveals enrolment to third parties |
| NQ-O7 | Is US storage of email metadata acceptable for the prototype? Does UW require Canadian residency, or a privacy review (auth-A2 mentions an IRA-PIA), for an email processor in production? | Rules out Resend, Postmark and SendGrid for production if Canada is required |
| NQ-O8 | Would UW IST provide a sanctioned sending path (relay, tenant mailbox, allow-listing) for production? | Deliverability; data location |
| NQ-O9 | Does CASL apply to ClearCourse notifications (are they commercial electronic messages)? If so, must every message, including essential ones, carry an unsubscribe mechanism (s.6(2), s.11)? | Possible conflict with "cannot be disabled" (Q13). Needs legal advice |
| NQ-O10 | Maximum acceptable provider log/body retention (part of Q17) | Provider choice and settings |
| NQ-O11 | Should activity-linked email digests be held until at least k recipients in a course share a window? If so, what k? (Like Q16) | Small-class timing leak (§4.3, vector 5) |
| NQ-O12 | Digest design (N2 personal vs N3 course-wide), cadence (e.g. daily or weekly) and send time | Usefulness vs privacy |
| NQ-O13 | If sign-in uses email codes, is a second, fallback email provider wanted? | Availability vs one more data processor |

---

## 7. Verification log

| Claim | URL | Checked | Status |
|---|---|---|---|
| SES: no SES-specific free allowance; up to $200 AWS credits for new customers; free plan 6 months; credits within 12 months | https://aws.amazon.com/ses/pricing/ | 2026-10-11 | Verified |
| SES à la carte $0.10/1,000 outbound; plans Essentials $0.16, Pro $0.22 + $105/mo, Enterprise $0.23 + $500/mo | https://aws.amazon.com/ses/pricing/ | 2026-10-11 | Verified |
| SES: accounts with no metered activity since 2025-06-01 start on Essentials from 2026-07-21 | https://aws.amazon.com/ses/pricing/ | 2026-10-11 | Verified |
| SES: no plan = à la carte; cancel returns to à la carte; plans per account per Region | https://docs.aws.amazon.com/ses/latest/dg/pricing-plans.html | 2026-10-11 | Verified |
| SES sandbox: verified recipients only, 200/24 h, 1/s, per Region; production request reviewed, initial response within 24 h | https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html | 2026-10-11 | Verified |
| SES initial production quota | https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html | 2026-10-11 | Unverified (not stated) |
| SES available in ca-central-1 and ca-west-1; no SMTP in ca-west-1 | https://docs.aws.amazon.com/general/latest/gr/ses.html | 2026-10-11 | Verified |
| SES open/click tracking only via configuration set + event destination; `ses:no-track`; 60-day metric collection; recipient-level | https://docs.aws.amazon.com/ses/latest/dg/faqs-metrics.html | 2026-10-11 | Verified |
| SES event `mail` object has destination, headers, commonHeaders; Click object has full link | https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html | 2026-10-11 | Verified |
| SES opportunistic TLS by default, configurable to require | https://docs.aws.amazon.com/ses/latest/dg/data-protection.html | 2026-10-11 | Verified |
| SES does not retain message bodies | https://docs.aws.amazon.com/ses/latest/dg/data-protection.html ; https://aws.amazon.com/ses/faqs/ | 2026-10-11 | Unverified (neither page states it) |
| AWS DPA/SCCs apply automatically; UK addendum in Service Terms | https://aws.amazon.com/compliance/gdpr-center/ | 2026-10-11 | Partly verified |
| SES production sending allowed on AWS free plan | — | 2026-10-11 | Unverified |
| Resend Free 3,000/mo, 100/day, 3 domains, 30-day retention; Pro $20/50k; overage $0.90/1k | https://resend.com/pricing | 2026-10-11 | Verified |
| Resend: all account data stored in US; regions us-east-1, eu-west-1, sa-east-1, ap-northeast-1 | https://resend.com/docs/dashboard/domains/regions.md | 2026-10-11 | Verified |
| Resend: content storage off only via support, Pro/Scale ≥1 month, >3,000 sent, <5% bounce, $50/mo add-on | https://resend.com/docs/knowledge-base/how-do-i-ensure-sensitive-data-isnt-stored-on-resend.md | 2026-10-11 | Verified (bodies-stored-by-default is inference from wording) |
| Resend: open/click tracking disabled by default per domain; tracking subdomain cannot be removed | https://resend.com/docs/dashboard/domains/tracking.md | 2026-10-11 | Verified |
| Resend: resend.dev sends only to account owner; verified domain needed | https://resend.com/docs/knowledge-base/403-error-resend-dev-domain.md | 2026-10-11 | Verified |
| Resend SOC 2 Type II; backups 7 days | https://resend.com/docs/security.md | 2026-10-11 | Verified |
| Resend DPA binding on entering the Agreement; US processing; SCCs + DPF; 90-day deletion | https://resend.com/legal/dpa | 2026-10-11 | Verified |
| Cloudflare Email Sending is Beta, Workers Paid only | https://developers.cloudflare.com/email-service/ | 2026-10-11 | Verified |
| Cloudflare: 3,000 included/month then $0.35/1,000; arbitrary recipients need Workers Paid | https://developers.cloudflare.com/email-service/platform/pricing/ | 2026-10-11 | Verified |
| Workers Paid minimum $5/month per account | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-10-11 | Verified |
| Cloudflare: conservative daily quota for new accounts (no figure); 50 recipients; 5 MiB | https://developers.cloudflare.com/email-service/platform/limits/ | 2026-10-11 | Verified (quota figure Unverified) |
| Cloudflare: domain must be in the Cloudflare account; cf-bounce records; DMARC default unclear | https://developers.cloudflare.com/email-service/configuration/domains/index.md | 2026-10-11 | Verified (nameserver requirement Unverified) |
| Cloudflare Email preview stores HTML/text/headers/raw ~7 days, on by default for new domains | https://developers.cloudflare.com/email-service/observability/logs/index.md | 2026-10-11 | Verified |
| Cloudflare Email DPA / data location | — | 2026-10-11 | Unverified |
| Postmark free 100/mo; Basic $15, Pro $16.50, Platform $18 at 10k; 45-day retention; add-on from $5/mo (Pro+) | https://postmarkapp.com/pricing | 2026-10-11 | Verified |
| Postmark hosted at Deft (Chicago area) + AWS; no EU plans; DPA in ToS since 2021-09-27; content kept 45 days; 7/28-day purge add-on | https://postmarkapp.com/eu-privacy | 2026-10-11 | Verified (page has one conflicting older DPA line) |
| Postmark link tracking off by default | https://postmarkapp.com/developer/user-guide/tracking-links | 2026-10-11 | Verified |
| Postmark open tracking default | — | 2026-10-11 | Unverified |
| Mailgun Free 100/day, 1 domain, 1-day logs; Basic $15/10k; Foundation $35, Scale $90; US/EU regions; message retention by plan | https://www.mailgun.com/pricing/ | 2026-10-11 | Verified |
| Mailgun DPA part of Sinch terms; EU/US sub-processors | https://www.mailgun.com/legal/dpa/ | 2026-10-11 | Partly verified (superseded 2023 version viewed) |
| Mailgun tracking defaults | https://documentation.mailgun.com/docs/mailgun/user-manual/tracking-messages/ | 2026-10-11 | Unverified (page covered unsubscribes only) |
| SendGrid: 60-day free trial at 100/day; page still says "free plan" in places; Essentials from $19.95, Pro from $89.95; activity 3 / 7 days | https://www.twilio.com/en-us/products/email-api/pricing | 2026-10-11 | Conflicting wording on page; trial terms verified |
| SendGrid Email Activity stored in US; add-on to 30 days | https://www.twilio.com/docs/sendgrid/ui/analytics-and-reporting/email-activity-feed | 2026-10-11 | Verified |
| SendGrid tracking defaults; DPA | https://www.twilio.com/docs/sendgrid/ui/account-and-settings/tracking | 2026-10-11 | Unverified |
| MailerSend Free 500/mo, 100 daily requests, 1 domain, 1-day activity, approval + card; Hobby $7/5k | https://www.mailersend.com/pricing | 2026-10-11 | Verified |
| MailerSend data hosted in EU; DPA page exists | https://www.mailersend.com/security | 2026-10-11 | Verified (DPA content not fetched) |
| Brevo free-plan limits, branding, region, DPA, retention | https://www.brevo.com/pricing/ ; https://www.brevo.com/gdpr/ ; https://developers.brevo.com/docs/getting-started (and others in §3.5) | 2026-10-11 | Unverified (pages not readable, re-tried twice; help centre 403) |
| Brevo API rate limits (POST /v3/smtp/email 1,000 RPS, general tier) | https://developers.brevo.com/docs/api-limits | 2026-10-11 | Verified |
| UW provides Outlook email to employees, students, alumni, retirees | https://uwaterloo.atlassian.net/wiki/spaces/ISTKB/pages/269156660/Microsoft+365+email | 2026-10-11 | Verified |
| UW licenses Defender for Office 365 / uses Safe Links | — | 2026-10-11 | Unverified |
| Microsoft 365 implicit/composite authentication; compauth fail not automatically blocked; SPF breaks on forwarding; delivery not guaranteed | https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about | 2026-10-11 | Verified |
| Outlook.com: from 2025-05-05, domains sending >5,000/day must meet SPF/DKIM/DMARC; junk now, reject later | https://substrate.office.com/ip-domain-management-snds/postmaster | 2026-10-11 | Verified (scope to M365 tenants and detailed rules Unverified) |
| Exchange message trace shows sender, recipient, first 256 subject characters; up to 90 days; admin roles | https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-modern-eac | 2026-10-11 | Verified |
| Safe Links scans before delivery, detonates no-reputation URLs, "Track user clicks" recommended on | https://learn.microsoft.com/en-us/defender-office-365/safe-links-about | 2026-10-11 | Verified |
| UrlClickEvents stores full URL + AccountUpn + timestamp + IP | https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-urlclickevents-table | 2026-10-11 | Verified |
| Gmail: all-sender and bulk (>5,000/day) requirements; DMARC p=none allowed; DKIM ≥1024 bits; spam <0.3% | https://support.google.com/a/answer/81126 | 2026-10-11 | Verified |
| Gmail: one-click unsubscribe excludes transactional; bulk status permanent; subdomains count; personal Gmail only | https://support.google.com/a/answer/14229414 | 2026-10-11 | Verified |
| DMARCbis = RFC 9989, Proposed Standard, May 2026; obsoletes RFC 7489 and 9091; reporting RFC 9990/9991 | https://datatracker.ietf.org/doc/draft-ietf-dmarc-dmarcbis/ | 2026-10-11 | Verified |
| RFC 8058 one-click unsubscribe, Proposed Standard, Jan 2017, POST-based, needs DKIM over both headers | https://www.rfc-editor.org/info/rfc8058 | 2026-10-11 | Verified |
| CASL s.6(1), 6(2), 6(6)(d) (exempts consent only), s.11(1) 10 business days, s.12(1) Canadian system; current to 2026-09-21 | https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html ; https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html | 2026-10-11 | Verified (applicability to ClearCourse not assessed) |
