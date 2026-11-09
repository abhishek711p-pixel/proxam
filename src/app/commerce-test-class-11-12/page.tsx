import GuidePage, { guideMetadata } from "@/components/GuidePage";

const SLUG = "commerce-test-class-11-12";
export const metadata = guideMetadata(SLUG);

export default function Page() {
  return <GuidePage slug={SLUG} />;
}
