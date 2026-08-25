import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { publicArticleCoverImageUrl, usePublicArticle } from "@/hooks/useArticles";
import { formatDate } from "@/lib/format";
import { renderMarkdownLite } from "@/lib/markdown";

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError, refetch } = usePublicArticle(slug);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Link to="/articles" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" />
          Back to articles
        </Link>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
        {isError && (
          <ErrorState title="We couldn't find that article" description="It may have been unpublished or the link is incorrect." onRetry={() => refetch()} />
        )}
        {article && (
          <article>
            {article.hasCoverImage && (
              <img
                src={publicArticleCoverImageUrl(article.slug)}
                alt=""
                className="mb-8 h-64 w-full rounded-xl2 object-cover sm:h-80"
              />
            )}
            <h1 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">{article.title}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              {article.author && <span>{article.author.name}</span>}
              {article.author && article.publishedAt && <span>&middot;</span>}
              {article.publishedAt && <span>{formatDate(article.publishedAt)}</span>}
            </div>
            <div className="mt-8">{renderMarkdownLite(article.body)}</div>
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
