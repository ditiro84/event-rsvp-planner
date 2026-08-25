import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/api";
import type { Article } from "@/types";

// --- Admin -----------------------------------------------------------------

export function useAdminArticles() {
  return useQuery({
    queryKey: ["admin", "articles"],
    queryFn: async () => {
      const res = await api.get("/admin/articles");
      return res.data.data.articles as Article[];
    },
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; excerpt: string; body: string }) => {
      const res = await api.post("/admin/articles", input);
      return res.data.data.article as Article;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, input }: { articleId: string; input: { excerpt?: string; body?: string } }) => {
      const res = await api.put(`/admin/articles/${articleId}`, input);
      return res.data.data.article as Article;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (articleId: string) => {
      await api.delete(`/admin/articles/${articleId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });
}

export function usePublishArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, publish }: { articleId: string; publish: boolean }) => {
      const res = await api.post(`/admin/articles/${articleId}/${publish ? "publish" : "unpublish"}`);
      return res.data.data.article as Article;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });
}

export function useUploadArticleCoverImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ articleId, file }: { articleId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/admin/articles/${articleId}/cover-image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data.article as Article;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "articles"] }),
  });
}

// Authenticated download path (see AuthedImage.tsx) -- not a plain <img src>.
export function adminArticleCoverImagePath(articleId: string) {
  return `/admin/articles/${articleId}/cover-image`;
}

// --- Public ----------------------------------------------------------------

export function usePublicArticles(limit = 20) {
  return useQuery({
    queryKey: ["public", "articles", limit],
    queryFn: async () => {
      const res = await api.get("/articles", { params: { limit } });
      return res.data.data.articles as Article[];
    },
  });
}

export function usePublicArticle(slug: string | undefined) {
  return useQuery({
    queryKey: ["public", "articles", slug],
    queryFn: async () => {
      const res = await api.get(`/articles/${slug}`);
      return res.data.data.article as Article;
    },
    enabled: !!slug,
  });
}

export function publicArticleCoverImageUrl(slug: string) {
  return `${apiBaseUrl}/articles/${slug}/cover-image`;
}
