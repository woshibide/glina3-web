// Coming-soon page: the turning cup behind the notice (site/templates/coming-soon.php).
// Without WebGL the page stays as it is, text only.
import { mountCup } from "glina-cup-tool";

const canvas = document.querySelector(".coming-soon-cup");
try {
  mountCup(canvas, { onReady: () => canvas.classList.add("is-ready") });
} catch (error) {
  console.error(error);
}
