# This fork

**Grok-Bot** at [cruiseliner/Grok-Bot](https://github.com/cruiseliner/Grok-Bot) is maintained by [@cruiseliner](https://github.com/cruiseliner).

The runtime was branched from [Orgo Teammates](https://github.com/nickvasilescu/orgo-teammates) by Nick Vasilescu. That code is MIT. The copyright notice in [LICENSE](../LICENSE) stays. New files in this fork are under the same MIT license, copyright the fork's authors, and still require that notice to travel with the code.

This is not the official Grok Bot app. It is not affiliated with xAI. It does not contain Grok Bot source.

## What was already the strong part

Kept, and not rewritten:

- Grok as the agent runtime (Responses API, streaming, tools, approvals, memory, compaction)
- One shared computer, up to four desktops, sleep and wake
- Connected apps, with reads automatic and writes pausing for approval (including "always allow" for that action)
- Primary bot, routines, check-ins, group chats, delegation, subagents
- Voice calls on the same loop
- Library of files the bots save

## What this fork adds

Written here, not copied from another repository:

- Roster actions: pin, duplicate, copy conversation id, hide. Duplicate copies the job and skills only. Hide does not apply to the primary bot.
- A team card. Share and Account → Copy team card export Markdown. Account → Import team card adds bots that are not already on the roster. The card has no chats, memories, keys, or computer access.

## Other public projects, and what we did not take

Looked at for ideas only. No source from these trees is in this repository.

| Project | Worth knowing | Not imported |
| --- | --- | --- |
| [OpenMausBot](https://github.com/milind-soni/OpenMausBot) | Chat-style roster, question cards, per-bot permission habits, portable team files | Their app, harness, enterprise folder, and team-file schema |
| [Rakazo](https://github.com/elie222/rakazo) | Self-hosted web, desktop, and phone clients over one API | Their server and clients |
| [superbot](https://github.com/davidondrej/superbot) | Named teammates with a shape and a color | Their Rust runtime |

## Catalogs, and what came back into this repo

Reviewed as lists, not as code to vendor:

- [ZeroPointRepo/awesome-grok-bot](https://github.com/ZeroPointRepo/awesome-grok-bot) — skills, plugins, and MCP servers. Useful as a map. This fork does not ship those plugins. Connected apps stay on Composio, which the runtime already has. Their security note stands: treat a shared bot, skill, or plugin as untrusted until you read it.
- [divo12/awesome-grok-bot-templates](https://github.com/divo12/awesome-grok-bot-templates) — public xAI share links plus long operating prompts. Those links are someone else's hosted bots. They are not imported.

What was written here from that review: [teams/personal-crew.md](../teams/personal-crew.md). It is a five-bot card (chief of staff, research, inbox, spend watch, review) in this repo's own team-card format. Import it from Account. It does not copy those prompts, and it does not include chats, memories, keys, or computer access.

The Windows window in [desktop/](../desktop/) is also original. It starts this server and opens it. It is not MausBot's installer and not the official Grok Bot app. A graphics card is not used. See [DESKTOP.md](DESKTOP.md).

Delegation stays short on purpose. Ada assigns one owner and states the outcome, why it matters, the scope, and what done looks like. Sends, payments, deletes, and deploys wait for the user. That matches how this runtime already pauses write tools.
