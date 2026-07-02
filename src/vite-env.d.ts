/// <reference types="vite/client" />

declare module "pagedjs" {
  export class Previewer {
    constructor(options?: Record<string, unknown>);
    preview(
      content?: DocumentFragment | Element | null,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: Element | null,
    ): Promise<{ pages?: unknown[]; total?: number; performance?: number }>;
  }
}

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void;
  }
}

export {};
