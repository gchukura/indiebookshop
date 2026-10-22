import { HONEYPOT_FIELD } from '@/lib/honeypot';

/**
 * Hidden honeypot input. Kept off-screen (not display:none, which some bots
 * skip) and out of the tab order and accessibility tree.
 * Read its value with getHoneypotValue(form) on submit.
 */
export default function HoneypotField() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
      <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
      <input
        type="text"
        id={HONEYPOT_FIELD}
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}

/** Current honeypot value from a submitted form element. */
export function getHoneypotValue(form: EventTarget | null | undefined): string {
  if (!(form instanceof HTMLFormElement)) return '';
  const input = form.elements.namedItem(HONEYPOT_FIELD);
  return input instanceof HTMLInputElement ? input.value : '';
}
