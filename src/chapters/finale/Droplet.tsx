/** Tiny blue drop echoing the liquid of chapter IV. */
export default function Droplet() {
  return (
    <svg viewBox="0 0 20 30" aria-hidden="true" focusable="false">
      <path
        d="M10 1C10 1 19 12 19 20a9 9 0 0 1-18 0C1 12 10 1 10 1Z"
        fill="var(--latte)"
        stroke="var(--black)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M5.5 19.5a4.6 4.6 0 0 0 3 4.3" fill="none" stroke="var(--cream)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
