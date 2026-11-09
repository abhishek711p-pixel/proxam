import GuidePage, { guideMetadata } from "@/components/GuidePage";

const SLUG = "class-10-stream-selection-test";
export const metadata = guideMetadata(SLUG);

export default function Page() {
  return <GuidePage slug={SLUG} />;
}
