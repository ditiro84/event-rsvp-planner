import { Request, Response } from "express";
import { created, noContent, ok } from "../../lib/apiResponse";
import { BadRequestError } from "../../lib/errors";
import { createArticleSchema, publicArticlesQuerySchema, updateArticleSchema } from "./articles.schema";
import * as service from "./articles.service";

// --- Admin ---------------------------------------------------------------

export async function list(_req: Request, res: Response) {
  const articles = await service.listAllArticles();
  return ok(res, { articles });
}

export async function getOne(req: Request, res: Response) {
  const article = await service.getArticleAdmin(req.params.articleId);
  return ok(res, { article });
}

export async function create(req: Request, res: Response) {
  const input = createArticleSchema.parse(req.body);
  const article = await service.createArticle(req.userId!, input);
  return created(res, { article });
}

export async function update(req: Request, res: Response) {
  const input = updateArticleSchema.parse(req.body);
  const article = await service.updateArticle(req.params.articleId, input);
  return ok(res, { article });
}

export async function remove(req: Request, res: Response) {
  await service.deleteArticle(req.params.articleId);
  return noContent(res);
}

export async function publish(req: Request, res: Response) {
  const article = await service.publishArticle(req.params.articleId);
  return ok(res, { article });
}

export async function unpublish(req: Request, res: Response) {
  const article = await service.unpublishArticle(req.params.articleId);
  return ok(res, { article });
}

export async function uploadCoverImage(req: Request, res: Response) {
  if (!req.file) throw new BadRequestError("No image file was uploaded");
  const article = await service.uploadArticleCoverImage(req.params.articleId, req.file);
  return ok(res, { article });
}

export async function downloadCoverImage(req: Request, res: Response) {
  const { data, mimeType } = await service.getArticleImageBytes(req.params.articleId);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "private, max-age=300");
  res.send(data);
}

// --- Public ----------------------------------------------------------------

export async function publicList(req: Request, res: Response) {
  const query = publicArticlesQuerySchema.parse(req.query);
  const articles = await service.listPublishedArticles(query.limit);
  return ok(res, { articles });
}

export async function publicGetBySlug(req: Request, res: Response) {
  const article = await service.getPublishedArticleBySlug(req.params.slug);
  return ok(res, { article });
}

export async function publicCoverImage(req: Request, res: Response) {
  const articleId = await service.getPublicArticleImageId(req.params.slug);
  const { data, mimeType } = await service.getArticleImageBytes(articleId);
  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(data);
}
