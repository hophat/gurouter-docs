# Design / UI

## Aesthetic direction

- Asks for a "modern, 2026" look — contemporary, current-year design language rather than retro, skeuomorphic, or heavily stylized aesthetics. Confidence: 0.6

## Evidence from work accepted on the GurRouter docs redesign (agent-executed, so treat as weak signal)

- Responds well to a rationale-first deliverable: the agent explained the color decision, the proof object, and the type system, and reported defects found by real browser verification rather than assertions. No corrections or pushback were issued. Confidence: 0.45
- The agent made two unrequested calls (replacing the favicon, converting two pages to MDX) and flagged them as easily revertible — the user did not object. Suggest keeping unrequested changes minimal and explicitly flagged. Confidence: 0.4
- Repeated with a hard-constraint brief ("make the title shift colors like the logo"): the
  agent chose the technical approach (full sampled gradient rather than a single accent
  color, light and dark token sets, a fallback path for older browsers) and reported the
  rationale without being asked. Weak signal, but consistent across two redesigns. Confidence: 0.45

## Wordmark / brand color (agent-executed, weak signal)

- A gradient logo demands a gradient wordmark, not one accent hue pulled from it. Picking
  a single "brand color" out of a spectrum logo makes the text and the mark read as two
  different brands. Take the whole ramp, in arc order. Confidence: 0.45
- Apply the gradient to the *label*, not the element that also contains the logo image.
  `background-clip: text` clips to the element's box, so putting it on the wrapping link
  tints the artwork. Confidence: 0.45
- Guard the transparent-fill trick with `@supports (background-clip: text)`. Setting
  `-webkit-text-fill-color: transparent` unconditionally makes the text *invisible* where
  clipping is unsupported, instead of degrading to the fallback color. Confidence: 0.45
- Verify both themes visually, not just the one the brief implies. Screenshots were taken
  in light and dark (dark forced by seeding `localStorage` in a helper page that redirects)
  and read back before committing. Confidence: 0.4
