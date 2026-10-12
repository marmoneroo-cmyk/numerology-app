import { createRoot } from "react-dom/client";
import Lab from "./Lab.jsx";
import "../fonts.css"; // the site's own fonts, as main.jsx loads them for the app

createRoot(document.getElementById("root")).render(<Lab />);
