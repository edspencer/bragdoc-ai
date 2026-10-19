---
"@bragdoc/local": minor
---

BragDoc 0.2.0: opt-in AI. Everything from 0.1 works exactly as before with AI off, which is how it starts: no model is
contacted and the AI SDK isn't even loaded. Turn it on in Settings → AI and point it at a model runner you already
have (Ollama, LM Studio, llama.cpp or any OpenAI-compatible server, on this computer or your network), or at
Anthropic, OpenAI or OpenRouter with your own key, which sends nothing until you've read exactly what each feature
would send there and pressed Allow. Then switch on what you want: a judge in Found that says whether a candidate looks
like a win for you, and why, and never keeps or dismisses anything itself; Tidy this up on the board; and Draft with
AI in Folio, with every bullet citing its achievement. Every model call is in Network activity, and every run in the
AI activity log.

