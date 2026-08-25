import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { useAdminArticles, useDeleteArticle, usePublishArticle } from "@/hooks/useArticles";
import type { Article } from "@/types";
import { ArticleFormModal } from "./ArticleFormModal";

export function ArticlesTab() {
  const { data, isLoading, isError, refetch } = useAdminArticles();
  const deleteArticle = useDeleteArticle();
  const publishArticle = usePublishArticle();
  const [modalArticle, setModalArticle] = useState<Article | "new" | null>(null);

  if (isError) return <ErrorState title="We couldn't load articles" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  async function handleDelete(article: Article) {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    try {
      await deleteArticle.mutateAsync(article.id);
      toast.success("Article deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function togglePublish(article: Article) {
    try {
      await publishArticle.mutateAsync({ articleId: article.id, publish: article.status !== "PUBLISHED" });
      toast.success(article.status === "PUBLISHED" ? "Article unpublished" : "Article published");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Published articles appear on the public /articles blog and are teased on the landing page.
        </p>
        <Button size="sm" onClick={() => setModalArticle("new")}>
          <Plus className="h-4 w-4" />
          New article
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState title="No articles yet" description="Write your first post to share updates with visitors." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Author</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((article) => (
                <tr key={article.id}>
                  <td className="px-5 py-3.5 font-medium text-slate-900">{article.title}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={article.status === "PUBLISHED" ? "success" : "neutral"}>
                      {article.status === "PUBLISHED" ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{article.author?.name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatRelativeTime(article.updatedAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => togglePublish(article)}
                        aria-label={article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        title={article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        {article.status === "PUBLISHED" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setModalArticle(article)}
                        aria-label="Edit"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(article)}
                        aria-label="Delete"
                        className="rounded-lg p-2 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ArticleFormModal
        open={!!modalArticle}
        onClose={() => setModalArticle(null)}
        article={modalArticle === "new" ? undefined : modalArticle ?? undefined}
      />
    </div>
  );
}
