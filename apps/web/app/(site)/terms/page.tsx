import Link from "next/link";
import { DocPage, docMetadata, type Section } from "../_components/DocPage";
import { CONTACT_EMAIL, CONTACT_HREF } from "@/components/site/data";

export const metadata = docMetadata({
  path: "/terms",
  title: "Terms of service",
  description: "The terms that govern your use of Threadline, the platform for building AI agents on iMessage, Telegram and WhatsApp.",
});

const Email = () => <a href={CONTACT_HREF}>{CONTACT_EMAIL}</a>;

const SECTIONS: Section[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These terms are an agreement between you and Threadline (“we”, “us”) covering your use of our website, dashboard,
        APIs and messaging lines (the “service”). By creating an account or using the service you agree to them. If you
        use Threadline on behalf of an organization, you confirm you are authorized to accept these terms for it.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Accounts",
    body: (
      <p>
        You must give accurate information when you sign up and keep your login details secure. You are responsible for
        activity under your account, including the actions of team members you invite. Tell us promptly at <Email /> if
        you suspect unauthorized access.
      </p>
    ),
  },
  {
    id: "your-agents",
    title: "Your agents and content",
    body: (
      <>
        <p>
          You keep ownership of the content you provide, including websites, API descriptions, prompts and files, and
          of the conversations your agents have. You grant us a limited license to host, process and transmit that
          content only as needed to run the service for you.
        </p>
        <p>
          You are responsible for what your agent says and does, including the tools you connect and the actions they
          take in your systems. AI output can be wrong; review your agent before launch and monitor it after.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to use Threadline to:</p>
        <ul>
          <li>send spam, unsolicited bulk messages or messages to people who have not contacted your agent;</li>
          <li>impersonate others, mislead people about who they are talking to, or hide that they are talking to an AI where disclosure is required;</li>
          <li>collect sensitive data such as payment card numbers or health records without appropriate safeguards and consent;</li>
          <li>break the law or the rules of Apple, Telegram, WhatsApp or our model providers;</li>
          <li>probe, overload or interfere with the service or other customers' agents.</li>
        </ul>
        <p>
          On shared lines, all businesses share a reputation. We may pause an agent that generates abuse reports or puts
          the line at risk.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party platforms",
    body: (
      <p>
        Delivery depends on messaging platforms and AI providers we do not control. They may change features, limit
        traffic or block numbers. We will work to keep things running, but we cannot guarantee delivery of any
        particular message or the continued availability of any channel.
      </p>
    ),
  },
  {
    id: "fees",
    title: "Plans and payment",
    body: (
      <p>
        Paid plans are billed in advance on a recurring basis until cancelled. Usage beyond your plan may be billed as
        described on the pricing page. Fees are non-refundable except where required by law. We may change prices with at
        least 30 days' notice; changes apply from your next billing period.
      </p>
    ),
  },
  {
    id: "data",
    title: "Data and privacy",
    body: (
      <p>
        Our <Link href="/privacy">privacy policy</Link> explains how we handle personal data. Conversation content is
        retained for 90 days unless you delete it sooner. You are responsible for giving any notices and obtaining any
        consents your end users require.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <p>
        You can stop using Threadline and delete your account at any time. We may suspend or end your access if you
        breach these terms, fail to pay, or create risk for us or others; where practical we will give notice first.
        After termination we delete your data in line with our retention schedule.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    body: (
      <>
        <p>
          The service is provided “as is” and “as available”. To the extent the law allows, we disclaim implied
          warranties of merchantability, fitness for a particular purpose and non-infringement.
        </p>
        <p>
          To the extent the law allows, we are not liable for indirect, incidental, special or consequential damages, or
          for lost profits or data. Our total liability for any claim is limited to the amount you paid us in the 12
          months before the claim arose.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and contact",
    body: (
      <p>
        We may update these terms. The date at the top shows the latest version; for material changes we will notify
        customers by email at least 14 days in advance. Continuing to use the service after changes take effect means
        you accept them. Questions? Write to <Email />.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <DocPage
      kind="legal"
      path="/terms"
      eyebrow="Terms"
      title="Terms of service"
      lede="The ground rules for building and running agents on Threadline, in plain language where we can manage it."
      sections={SECTIONS}
    />
  );
}
