import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../lib/api-client';
import { config as envConfig } from '../config/env';
import { useSettingsStore } from '../stores/settings-store';

/** Returns the AI provider config from settings, or null if AI is not configured */
export function useAIConfig() {
  const {
    aiEnabled,
    aiProvider,
    aiApiKeys,
    aiCustomProvider,
    aiWritingAssistant,
    aiQuickReplies,
    aiThreadSummary,
    aiTranslation,
  } = useSettingsStore();

  const apiKey =
    aiProvider === 'custom'
      ? aiCustomProvider.apiKey
      : aiApiKeys[aiProvider] || '';

  const baseUrl = aiProvider === 'custom' ? aiCustomProvider.baseUrl : undefined;

  const isConfigured = aiEnabled && !!apiKey;

  return {
    isConfigured,
    aiEnabled,
    provider: aiProvider,
    apiKey,
    baseUrl,
    features: {
      writingAssistant: aiWritingAssistant,
      quickReplies: aiQuickReplies,
      threadSummary: aiThreadSummary,
      translation: aiTranslation,
    },
  };
}

// ---------------------------------------------------------------------------
// Thread summary hook
// ---------------------------------------------------------------------------

export function useThreadSummary() {
  const config = useAIConfig();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = useCallback(
    async (threadId: string) => {
      if (!config.isConfigured || !config.features.threadSummary) return;

      setLoading(true);
      setError(null);
      setSummary(null);

      try {
        const { data } = await api.post('/ai/summarize', {
          threadId,
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
        });
        setSummary(data.data.summary);
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Failed to summarize';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [config.isConfigured, config.features.threadSummary, config.provider, config.apiKey, config.baseUrl],
  );

  const clear = useCallback(() => {
    setSummary(null);
    setError(null);
  }, []);

  return { summary, loading, error, summarize, clear, enabled: config.isConfigured && config.features.threadSummary };
}

// ---------------------------------------------------------------------------
// Quick replies hook
// ---------------------------------------------------------------------------

interface QuickReply {
  label: string;
  body: string;
}

export function useQuickReplies() {
  const config = useAIConfig();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (threadId: string) => {
      if (!config.isConfigured || !config.features.quickReplies) return;

      setLoading(true);
      setError(null);
      setReplies([]);

      try {
        const { data } = await api.post('/ai/quick-replies', {
          threadId,
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
        });
        setReplies(data.data.replies);
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || 'Failed to generate replies';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [config.isConfigured, config.features.quickReplies, config.provider, config.apiKey, config.baseUrl],
  );

  const clear = useCallback(() => {
    setReplies([]);
    setError(null);
  }, []);

  return { replies, loading, error, generate, clear, enabled: config.isConfigured && config.features.quickReplies };
}

// ---------------------------------------------------------------------------
// Writing assist hook (streaming)
// ---------------------------------------------------------------------------

export function useWritingAssist() {
  const config = useAIConfig();
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const assist = useCallback(
    async (
      prompt: string,
      context?: { subject?: string; existingDraft?: string; threadSnippet?: string },
    ) => {
      if (!config.isConfigured || !config.features.writingAssistant) return;

      // Abort any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setOutput('');

      try {
        const response = await fetch(
          `${envConfig.apiUrl}/ai/write-assist`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('atlasmail_token') || ''}`,
            },
            body: JSON.stringify({
              prompt,
              provider: config.provider,
              apiKey: config.apiKey,
              baseUrl: config.baseUrl,
              context,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setOutput(accumulated);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        const msg = err?.message || 'Failed to generate';
        setError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [config.isConfigured, config.features.writingAssistant, config.provider, config.apiKey, config.baseUrl],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setOutput('');
    setError(null);
    setLoading(false);
  }, []);

  return { output, loading, error, assist, clear, enabled: config.isConfigured && config.features.writingAssistant };
}
