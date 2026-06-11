import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sentinel V1",
    short_name: "Sentinel",
    description: "Personal safety and infrastructure awareness for South Africa",
    start_url: "/",
    display: "standalone",
    background_color: "#09060a",
    theme_color: "#09060a",
    lang: "en",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
