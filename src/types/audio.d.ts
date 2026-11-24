// Bundled sound files resolve to a Metro asset id (wav is in Metro's default assetExts).
declare module '*.wav' {
  const asset: number;
  export default asset;
}
