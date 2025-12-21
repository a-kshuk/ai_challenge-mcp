import "dotenv/config";
import { selectEntrypoint } from "./selector";

selectEntrypoint().then((entrypoint) => {
  entrypoint.run();
});
