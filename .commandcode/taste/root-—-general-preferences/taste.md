# Root — general preferences
- Writes prompts in Vietnamese, usually typed without diacritics (e.g. "giao diện docs yêu cầu hiện đại đẹp 2026"), though diacritics do appear sometimes ("/mcp hướng dẫn cách dùng"). Treat it as Vietnamese intent either way. Note that pasted source material often arrives in English (a YouTube title/description/keywords block) — do not mirror the pasted language back in the reply; reply in Vietnamese. Confidence: 0.65
- Hands over ready-made external copy as the brief — a YouTube title, description, keyword list, hashtags, and a raw `<iframe>` embed. That block is source material to convert, not the deliverable: what is wanted is a real page in the site's existing structure and voice, not the marketing description retyped. Confidence: 0.55
- A content brief ("add thêm 1 page viết về ...") authorizes writing the page and committing it locally. It does not authorize push or deploy — shipping is a separate ask, and the offer to push should be made at the end rather than assumed. Confidence: 0.5
- Thinks in terms of the CLI's slash-command surface ("/mcp") and may type a command as if it were a message. When that happens, don't just echo the menu — verify the underlying state and answer the real question behind it, in the user's language. Confidence: 0.5
- Asks "how do I use this" in a few words, and expects a complete written guide back: numbered setup steps, a table of every option with when to use it, and the gotchas that bite. One well-structured answer, no follow-up questions. Confidence: 0.55
- Gives extremely terse, one-line briefs and expects the agent to make the design/architecture calls autonomously rather than asking clarifying questions first. Confidence: 0.75
- Replies to a numbered list of options with just the number ("2"). A bare digit selecting from your own list is a complete instruction — treat it as full authorization for everything that option said, and carry it out end to end without echoing the choice back or re-confirming. Confidence: 0.6
- Surface adjacent operational risk that falls outside the requested scope, briefly and without
  acting on it. The VPS disk was at 88% before the sweep and 89% after, with the growth attributed
  to something outside the agent's scope — reported in one line as "not mine to fix today, but
  know before it becomes a problem", with no offer to go dig. Scope discipline plus a heads-up. Confidence: 0.5
- Final sign-off is a compact evidence block, not prose: the last few commit subjects, a
  before→after cleanup table, and the routes/lines the user needs to reproduce it themselves.
  It closes with one explicit sentence that nothing is left outstanding — an unstated
  completion reads back to the user as an open question. Confidence: 0.5
- Follow-ups are terse status checks ("done chưa ?", "merge & close task, clean") rather than new
  instructions. Read them as "give me the state of the work / finish the housekeeping", so a good
  reply states what is done, what is not, and where things stand in the repo (committed / pushed /
  deployed) rather than re-explaining the plan. Confidence: 0.7
- Frames requests around a desired *outcome and mood* ("modern, beautiful, 2026") rather than implementation detail; the agent is expected to derive the concrete spec. Confidence: 0.55
- Confirms understanding tersely and moves on ("Rõ rồi", "ftech nội dung" → "tạo docs cho từng model"). Treat a short affirmative as approval to proceed, not as a request for more detail. Confidence: 0.55
- States the end-state architecture in the brief itself, in one line: "thiết lập MCP cho docs để sau AI agent dễ dàng quản lý content, tôi sẽ điều khiển agent để quản lý docs" is not a feature request for an MCP server, it is a decision that content is meant to be managed by an agent the user directs. Read briefs like this for the operating model they imply, not just the artifact named. Confidence: 0.6
- For "how do we manage this content", a human-facing CMS was passed over in favour of a tool interface an agent can drive. The user is the one directing; the agent is the one doing. Expect tooling, not authoring UIs. Confidence: 0.5
