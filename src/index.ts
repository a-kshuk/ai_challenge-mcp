import "dotenv/config";
import { selectEntrypoint } from "./entrypoint/selector";

selectEntrypoint().then((entrypoint) => {
  entrypoint.run();
});
