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

Official Grok Bot stays a closed product. A copy of that account, its computer, or its chats is not possible from this repo and is not a goal.
