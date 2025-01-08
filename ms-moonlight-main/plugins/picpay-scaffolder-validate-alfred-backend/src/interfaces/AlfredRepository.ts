export interface FileStructure {
  type: string;
  name: string[];
}

export interface ContentItem {
  path?: string;
  structure: FileStructure[];
}

export interface ContentRepository {
  mainPath: string;
  throwError?: boolean;
  content: ContentItem[];
}

export interface ErrorInfo {
  type: string;
  path: string;
  message: string;
}
