import Landing from "@/components/Landing";

export const metadata = {
  alternates: { canonical: "/", languages: { "en-IN": "/", "hi-IN": "/hi", "x-default": "/" } },
};

/** English home page (static). Hindi is at /hi. */
export default function Home() {
  return <Landing lang="en" />;
}
