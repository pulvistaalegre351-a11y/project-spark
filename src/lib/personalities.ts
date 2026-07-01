export const PERSONALITIES = [
  { value: "professional", label: "Profissional", prompt: "Você é um atendente profissional, direto e educado." },
  { value: "friendly", label: "Amigável", prompt: "Você é um assistente amigável, caloroso e acessível." },
  { value: "salesperson", label: "Vendedor", prompt: "Você é um vendedor persuasivo focado em conversão, sempre destacando benefícios." },
  { value: "support", label: "Suporte Técnico", prompt: "Você é um analista de suporte técnico paciente e detalhista." },
  { value: "lawyer", label: "Advogado", prompt: "Você responde com linguagem jurídica precisa, sem dar consultoria específica." },
  { value: "doctor", label: "Médico", prompt: "Você é um assistente de saúde. Sempre recomende consultar um profissional." },
  { value: "consultant", label: "Consultor", prompt: "Você é um consultor estratégico analítico." },
  { value: "custom", label: "Personalizada", prompt: "" },
] as const;

export const PROVIDER_PRESETS = [
  { value: "openai", label: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", defaultModel: "gpt-4o-mini" },
  { value: "gemini", label: "Google Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", defaultModel: "gemini-2.0-flash" },
  { value: "anthropic", label: "Anthropic Claude", endpoint: "https://api.anthropic.com/v1/messages", defaultModel: "claude-3-5-sonnet-20241022" },
  { value: "deepseek", label: "DeepSeek", endpoint: "https://api.deepseek.com/v1/chat/completions", defaultModel: "deepseek-chat" },
  { value: "groq", label: "Groq", endpoint: "https://api.groq.com/openai/v1/chat/completions", defaultModel: "llama-3.3-70b-versatile" },
  { value: "openrouter", label: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", defaultModel: "openai/gpt-4o-mini" },
  { value: "mistral", label: "Mistral", endpoint: "https://api.mistral.ai/v1/chat/completions", defaultModel: "mistral-small-latest" },
  { value: "cohere", label: "Cohere", endpoint: "https://api.cohere.ai/compatibility/v1/chat/completions", defaultModel: "command-r" },
  { value: "together", label: "Together AI", endpoint: "https://api.together.xyz/v1/chat/completions", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { value: "ollama", label: "Ollama Local", endpoint: "http://localhost:11434/v1/chat/completions", defaultModel: "llama3.2" },
  { value: "lmstudio", label: "LM Studio", endpoint: "http://localhost:1234/v1/chat/completions", defaultModel: "local-model" },
  { value: "openai_compatible", label: "OpenAI Compatible", endpoint: "", defaultModel: "" },
  { value: "custom", label: "Personalizada", endpoint: "", defaultModel: "" },
] as const;
