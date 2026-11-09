import GuidePage, { guideMetadata } from "@/components/GuidePage";

const SLUG = "free-neet-practice-test";
export const metadata = guideMetadata(SLUG);

export default function Page() {
  return <GuidePage slug={SLUG} />;
}
