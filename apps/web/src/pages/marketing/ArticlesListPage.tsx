import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { publicArticleCoverImageUrl, usePublicArticles } from "@/hooks/useArticles";
import { formatDate } from "@/lib/format";

export default function ArticlesListPage() {
  const { data: articles, isLoading, isError, refetch } = usePublicArticles(50);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold text-slate-950 sm:text-5xl">Articles</h1>
          <p className="mt-3 text-lg text-slate-600">Updates and tips from the Gadaova team.</p>
        </div>

        <div className="mt-12">
          {isError && <ErrorState title="We couldn't load articles" onRetry={() => refetch()} />}
          {isLoading && (
            <div className="flex justify-center">
              <Spinner />
            </div>
          )}
          {articles && articles.length === 0 && (
            <EmptyState title="No articles yet" description="Check back soon for updates." />
          )}
          {articles && articles.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {articles.map((article) => (
                <Link key={article.id} to={`/articles/${article.slug}`}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-elevated">
                    {article.hasCoverImage && (
                      <img src={publicArticleCoverImageUrl(article.slug)} alt="" className="h-48 w-full object-cover" />
                    )}
                    <div className="p-6">
                      <h2 className="font-display text-xl font-semibold text-slate-950">{article.title}</h2>
                      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{article.excerpt}</p>
                      {article.publishedAt && (
                        <p className="mt-4 text-xs text-slate-400">{formatDate(article.publishedAt)}</p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
