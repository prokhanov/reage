// Ambient module declarations for Vite/imagetools query-string imports.
// Must NOT contain top-level import/export so declarations remain ambient.

declare module "*&url" {
  const src: string;
  export default src;
}
declare module "*?url" {
  const src: string;
  export default src;
}
