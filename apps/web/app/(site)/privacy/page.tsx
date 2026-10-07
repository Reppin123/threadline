import { DocPage, docMetadata, type Section } from "../_components/DocPage";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/components/site/data";

export const metadata = docMetadata({
  path: "/privacy",
  title: "Privacy policy",
  description:
    "How Threadline collects, uses, stores and deletes personal data for customers and for the people who chat with Threadline agents.",
});

const Email = () => <a href={CONTACT_HREF}>{CONTACT_EMAIL}</a>;

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "Overview",
    body: (
      <>
        <p>
          Threadline lets businesses build AI agents and run them on messaging apps such as iMessage, Telegram and
          WhatsApp. This policy explains what personal data we handle, why, and the choices you have. It covers two
          groups of people: <strong>customers</strong>, who sign up and build agents, and <strong>end users</strong>,
          who chat with those agents.
        </p>
        <p>
          For conversations between an end user and a customer's agent, the customer decides why the agent exists and
          what it does, and we process that data on the customer's behalf. For account, billing and website data, we are
          responsible for it directly.
        </p>
      </>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    body: (
      <ul>
        <li>
          <strong>Account data:</strong> name, email address, password hash or sign-in provider details, and team
          membership.
        </li>
        <li>
          <strong>Agent configuration:</strong> websites, API descriptions, prompts, files and credentials you give us
          to build and run your agent.
        </li>
        <li>
          <strong>Conversation data:</strong> messages exchanged with agents, the sender's channel identifier (such as a
          phone number or Telegram user ID), timestamps, and the tool calls an agent made.
        </li>
        <li>
          <strong>Billing data:</strong> plan, invoices and payment status. Card details are handled by our payment
          processor and never stored on our servers.
        </li>
        <li>
          <strong>Usage and device data:</strong> log data, IP address, browser type and pages visited, used to keep the
          service secure and working.
        </li>
      </ul>
    ),
  },
  {
    id: "how-we-use-data",
    title: "How we use data",
    body: (
      <>
        <p>We use personal data to:</p>
        <ul>
          <li>provide, operate and secure the service, including routing messages to the right agent;</li>
          <li>generate agent replies using third-party AI model providers;</li>
          <li>test agents against simulated conversations you start;</li>
          <li>support you, bill you and send service-related notices;</li>
          <li>detect abuse, spam and violations of our terms.</li>
        </ul>
        <p>
          We do not sell personal data, and we do not use customers' conversation data to train our own or third-party
          foundation models.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention",
    body: (
      <>
        <p>
          Conversation content is kept for <strong>90 days</strong> from the date of each message and then deleted or
          irreversibly anonymized, unless a customer deletes it sooner. Account data is kept while your account is
          active and for a short period afterwards to handle billing and legal obligations. Backups roll off on their
          own schedule, typically within 30 days of deletion from the live system.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and subprocessors",
    body: (
      <>
        <p>We share data only with service providers that help us run Threadline, under contracts that limit their use of it:</p>
        <ul>
          <li>cloud hosting and database providers;</li>
          <li>AI model providers that generate agent responses;</li>
          <li>messaging infrastructure for iMessage, Telegram and WhatsApp;</li>
          <li>payment processing, email delivery and error monitoring.</li>
        </ul>
        <p>
          We may also disclose data when required by law, to protect the rights and safety of people using the service,
          or as part of a merger or acquisition, in which case this policy continues to apply.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Data is encrypted in transit and at rest. Credentials you provide for your agent's tools are stored encrypted
        and used only to make the calls you configured. Access to production systems is limited to staff who need it.
        No system is perfectly secure; if we learn of a breach affecting your data, we will notify you without undue
        delay.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>
          Depending on where you live, you may have the right to access, correct, delete or export your personal data,
          and to object to or restrict certain processing. Customers can delete conversations and agents from the
          dashboard at any time. End users can stop messaging an agent at any time, and can ask the business that runs
          the agent, or us, to delete their data.
        </p>
        <p>
          To exercise any of these rights, email <Email />. We will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International transfers",
    body: (
      <p>
        We and our providers may process data in countries other than yours. Where required, we rely on appropriate
        safeguards such as standard contractual clauses.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Threadline is not directed at children under 13, or under 16 where local law requires, and we do not knowingly
        collect their data. Customers must not deploy agents aimed at children.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        We may update this policy as the service changes. The date at the top shows when it was last revised, and we
        will notify customers of material changes by email. Questions? Write to <Email />.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <DocPage
      kind="legal"
      path="/privacy"
      eyebrow="Privacy"
      title="Privacy policy"
      lede="What we collect, why we collect it, how long we keep it and how to reach us about it."
      sections={SECTIONS}
    />
  );
}
