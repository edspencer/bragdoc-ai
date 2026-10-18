---
'@bragdoc/local': patch
---

Settings → AI: one place to see and control everything AI, where nothing happens without you. AI is still off by
default, and with it off nothing on this page can reach a model. Turn it on to add where models run (Ollama, LM
Studio, llama.cpp, any OpenAI-compatible server, or Anthropic, OpenAI and OpenRouter with your own key), test a
connection and see the answer in plain words, and pick the model features will use. Anything on the internet asks
first: a consent screen says exactly what each feature would send there, field by field, and whose terms apply, and
nothing is sent before you allow it. "Look for a model runner on this computer" finds one you already have (BragDoc
never installs one), and "Recommended for this computer" suggests a model from your RAM, with its `ollama pull`
command and, after a confirm that states the download size, free disk space and RAM, an "Ask Ollama to download it"
button. Network activity now stamps every model call this computer, your network or internet, and totals what went to
AI providers on the internet. While AI is on, the header shows where models run.
