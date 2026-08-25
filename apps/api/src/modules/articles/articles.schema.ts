import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  excerpt: z.string().trim().min(1, "Excerpt is required").max(400),
  body: z.string().trim().min(1, "Body is required").max(20_000),
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

// Title (and therefore slug) is intentionally not editable after creation
// -- see the comment on Article.slug in schema.prisma.
export const updateArticleSchema = z.object({
  excerpt: z.string().trim().min(1).max(400).optional(),
  body: z.string().trim().min(1).max(20_000).optional(),
});
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const articleIdParamsSchema = z.object({
  articleId: z.string().min(1),
});

export const articleSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const publicArticlesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PublicArticlesQuery = z.infer<typeof publicArticlesQuerySchema>;
