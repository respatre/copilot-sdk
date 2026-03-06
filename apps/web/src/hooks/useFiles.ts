"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFileContent, fetchFiles, type FileNode } from "../lib/api";

export function useFiles(projectId: string | null) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    try {
      const tree = await fetchFiles(projectId);
      setFiles(tree);
    } catch {
      // silent
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openFile = useCallback(
    async (filePath: string) => {
      if (!projectId) return;
      setSelectedFile(filePath);
      setLoading(true);
      try {
        const content = await fetchFileContent(projectId, filePath);
        setFileContent(content);
      } catch {
        setFileContent("// Error loading file");
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const closeFile = useCallback(() => {
    setSelectedFile(null);
    setFileContent("");
  }, []);

  return {
    files,
    selectedFile,
    fileContent,
    loading,
    refresh,
    openFile,
    closeFile,
  };
}
