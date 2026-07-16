/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare module "*&url" {
  const src: string;
  export default src;
}
declare module "*?url" {
  const src: string;
  export default src;
}

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
