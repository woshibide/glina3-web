import { createApp } from "vue";
import App from "./App.vue";

// Styles are linked separately by the template (src/styles/main.css), so the server HTML never paints unstyled.
// Kirby renders the page data into this script tag (see site/templates/default.php).
const source = document.getElementById("kirby-data");
if (!source) throw new Error("Missing #kirby-data: the Kirby template must render the page data.");

createApp(App, JSON.parse(source.textContent)).mount("#app");
