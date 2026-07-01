
CREATE TABLE public.whatsapp_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chatbot_id UUID NOT NULL REFERENCES public.chatbots(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'WhatsApp',
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT,
  access_token TEXT NOT NULL,
  verify_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_error TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_integrations TO authenticated;
GRANT ALL ON public.whatsapp_integrations TO service_role;

ALTER TABLE public.whatsapp_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own whatsapp integrations"
ON public.whatsapp_integrations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_whatsapp_integrations_updated_at
BEFORE UPDATE ON public.whatsapp_integrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_integrations_chatbot ON public.whatsapp_integrations(chatbot_id);
CREATE INDEX idx_whatsapp_integrations_phone ON public.whatsapp_integrations(phone_number_id);

-- Table for external whatsapp conversations (identified by wa phone number)
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.whatsapp_integrations(id) ON DELETE CASCADE,
  wa_phone TEXT NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, wa_phone)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own whatsapp conversations"
ON public.whatsapp_conversations FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.whatsapp_integrations wi
  WHERE wi.id = integration_id AND wi.user_id = auth.uid()
));
