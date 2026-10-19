---
"@bragdoc/local": patch
---

The groundwork for opt-in AI. `config.yaml` gains an `ai:` section with everything off: a master switch, connections to a model runner on your machine or network (Ollama, LM Studio, llama.cpp, any OpenAI-compatible server) or to a cloud provider (Anthropic, OpenAI, OpenRouter), and a switch per feature. With AI off nothing changes and BragDoc doesn't even load its AI code. A connection whose address is on the internet sends nothing, not even a test, until you accept a statement of exactly what would be sent there; keys are kept in `secrets.yaml` and never shown again. Every model call, local ones included, appears in Network activity marked as going to this computer, your network or the internet.
