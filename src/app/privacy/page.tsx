import PublicHeader from "@/components/PublicHeader";
import { BRAND } from "@/lib/config";

export const metadata = { title: "Privacy notice", alternates: { canonical: "/privacy" } };

export default function Privacy() {
  return (
    <>
      <PublicHeader lang="en" />
      <main className="container-x max-w-3xl py-8 md:py-12">
        <article className="card space-y-4 text-slate-700">
          <h1 className="text-2xl font-bold text-slate-900">Privacy notice (draft)</h1>
          <p className="text-sm text-accent-700">Draft for development. Get this reviewed before launch (PRD section 13).</p>
          <p>We follow India&apos;s Digital Personal Data Protection Act, 2023. Many of our students are under 18; the Act requires verifiable consent from a parent or guardian for them. Review this with a lawyer before launch.</p>
          <h2 className="font-semibold text-slate-900">What we collect</h2>
          <p>Student name, mobile number, class, stream, school, city, board, goal, language, optional email; test answers and results; call bookings and counsellor notes.</p>
          <h2 className="font-semibold text-slate-900">Why</h2>
          <p>To run the test, show results, hold the free guidance call and prepare the Gap and Goal report. Nothing else.</p>
          <h2 className="font-semibold text-slate-900">What we do not do</h2>
          <p>No tracking or behavioural monitoring of children, no targeted advertising to children, no selling of data.</p>
          <h2 className="font-semibold text-slate-900">Your rights</h2>
          <p>A student or parent can ask us to see, correct or delete the student&apos;s data at any time. Contact: support@example.com (replace with your real address).</p>
          <hr />
          <p lang="hi">सारांश: डेटा सिर्फ़ टेस्ट, रिज़ल्ट और गाइडेंस कॉल के लिए इस्तेमाल होता है। कोई विज्ञापन या ट्रैकिंग नहीं। माँगने पर डेटा डिलीट किया जाएगा।</p>
        </article>
      </main>
    </>
  );
}
