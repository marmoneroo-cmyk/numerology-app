/**
 * The quiet line at the top of a Studio screen that says what the screen is for (texts: screenHelp.js).
 * @param {{ text?: string, he: boolean }} props
 */
import Icon from "../ui/Icon.jsx";

export default function ScreenIntro({ text, he }) {
  if (!text) return null;
  return (
    <p className="st-intro" role="note" aria-label={he ? "על המסך הזה" : "About this screen"}>
      <span className="st-intro-icon" aria-hidden="true">
        <Icon name="bulb" size={18} />
      </span>
      <span>{text}</span>
    </p>
  );
}
