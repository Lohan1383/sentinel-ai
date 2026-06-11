import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Sentinel API running on 0.0.0.0:${env.PORT}`);
});
