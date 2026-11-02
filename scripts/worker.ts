import { pathToFileURL } from "node:url";
import { tick } from "../src/modules/notifications/processor";
export { tick };
async function main() {
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error(
        "No se pudieron procesar recordatorios",
        e instanceof Error ? e.name : "Error",
      );
    }
    await new Promise((r) => setTimeout(r, 30000));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  void main();
