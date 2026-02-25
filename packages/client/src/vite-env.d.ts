/// <reference types="vite/client" />

declare module '@browsermt/bergamot-translator/translator.js' {
  export class LatencyOptimisedTranslator {
    constructor(options?: { pivotLanguage?: string; downloadTimeout?: number });
    translate(request: {
      from: string;
      to: string;
      text: string;
      html?: boolean;
    }): Promise<{ target: { text: string } }>;
    delete(): Promise<void>;
  }
}
