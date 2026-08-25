import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { CreateArticleInput, UpdateArticleInput } from "./articles.schema";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "article";
}

// Appends -2, -3, ... on collision -- titles aren't guaranteed unique, but
// slugs must be (they're the public URL).
async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeArticle(article: any) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    body: article.body,
    hasCoverImage: !!article.coverImageData,
    status: article.status,
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    author: article.author ? { id: article.author.id, name: article.author.name, email: article.author.email } : undefined,
  };
}

const AUTHOR_SELECT = { author: { select: { id: true, name: true, email: true } } };

// --- Admin -------------------------------------------------------------

export async function listAllArticles() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: AUTHOR_SELECT,
  });
  return articles.map(serializeArticle);
}

export async function getArticleAdmin(articleId: string) {
  const article = await prisma.article.findUnique({ where: { id: articleId }, include: AUTHOR_SELECT });
  if (!article) throw new NotFoundError("Article not found");
  return serializeArticle(article);
}

export async function createArticle(authorId: string, input: CreateArticleInput) {
  const slug = await ensureUniqueSlug(slugify(input.title));
  const article = await prisma.article.create({
    data: { authorId, title: input.title, slug, excerpt: input.excerpt, body: input.body },
    include: AUTHOR_SELECT,
  });
  return serializeArticle(article);
}

export async function updateArticle(articleId: string, input: UpdateArticleInput) {
  await getArticleAdmin(articleId);
  const article = await prisma.article.update({
    where: { id: articleId },
    data: input,
    include: AUTHOR_SELECT,
  });
  return serializeArticle(article);
}

export async function deleteArticle(articleId: string) {
  await getArticleAdmin(articleId);
  await prisma.article.delete({ where: { id: articleId } });
}

export async function publishArticle(articleId: string) {
  await getArticleAdmin(articleId);
  const article = await prisma.article.update({
    where: { id: articleId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    include: AUTHOR_SELECT,
  });
  return serializeArticle(article);
}

export async function unpublishArticle(articleId: string) {
  await getArticleAdmin(articleId);
  const article = await prisma.article.update({
    where: { id: articleId },
    data: { status: "DRAFT" },
    include: AUTHOR_SELECT,
  });
  return serializeArticle(article);
}

export async function uploadArticleCoverImage(articleId: string, file: UploadedFile) {
  await getArticleAdmin(articleId);
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw new BadRequestError("Cover image must be a PNG, JPEG, or WEBP file");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestError("Cover image must be 5MB or smaller");
  }
  const article = await prisma.article.update({
    where: { id: articleId },
    data: { coverImageData: file.buffer, coverImageMimeType: file.mimetype },
    include: AUTHOR_SELECT,
  });
  return serializeArticle(article);
}

// Internal (no auth) -- used by both the admin cover-image route and the
// public /articles image route.
export async function getArticleImageBytes(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { coverImageData: true, coverImageMimeType: true },
  });
  if (!article || !article.coverImageData || !article.coverImageMimeType) {
    throw new NotFoundError("Cover image not found");
  }
  return { data: article.coverImageData, mimeType: article.coverImageMimeType };
}

// --- Public --------------------------------------------------------------

export async function listPublishedArticles(limit: number) {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: AUTHOR_SELECT,
  });
  return articles.map(serializeArticle);
}

export async function getPublishedArticleBySlug(slug: string) {
  const article = await prisma.article.findUnique({ where: { slug }, include: AUTHOR_SELECT });
  if (!article || article.status !== "PUBLISHED") throw new NotFoundError("Article not found");
  return serializeArticle(article);
}

export async function getPublicArticleImageId(slug: string) {
  const article = await prisma.article.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!article || article.status !== "PUBLISHED") throw new NotFoundError("Article not found");
  return article.id;
}
