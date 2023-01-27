// Automatically generated by GDevelop.js/scripts/generate-types.js
declare class gdPreviewExportOptions {
  constructor(project: gdProject, outputPath: string): void;
  useWebsocketDebuggerClientWithServerAddress(address: string, port: string): gdPreviewExportOptions;
  useWindowMessageDebuggerClient(): gdPreviewExportOptions;
  setLayoutName(layoutName: string): gdPreviewExportOptions;
  setFallbackAuthor(id: string, username: string): gdPreviewExportOptions;
  setExternalLayoutName(externalLayoutName: string): gdPreviewExportOptions;
  setIncludeFileHash(includeFile: string, hash: number): gdPreviewExportOptions;
  setProjectDataOnlyExport(enable: boolean): gdPreviewExportOptions;
  setFullLoadingScreen(enable: boolean): gdPreviewExportOptions;
  setIsDevelopmentEnvironment(enable: boolean): gdPreviewExportOptions;
  setNonRuntimeScriptsCacheBurst(value: number): gdPreviewExportOptions;
  setElectronRemoteRequirePath(electronRemoteRequirePath: string): gdPreviewExportOptions;
  setGDevelopResourceToken(gdevelopResourceToken: string): gdPreviewExportOptions;
  delete(): void;
  ptr: number;
};