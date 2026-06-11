import dynamic from "next/dynamic";

const SentinelApp = dynamic(() => import("../components/sentinel-app").then((mod) => mod.SentinelApp), {
  ssr: false
});

export default function Page() {
  return <SentinelApp />;
}
