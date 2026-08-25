import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin, registerAndLoginAsAdmin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

describe("Articles: admin access control", () => {
  it("rejects a regular planner from the admin articles endpoints", async () => {
    const { token } = await registerAndLogin(app);
    const res = await request(app)
      .post("/api/admin/articles")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Hello", excerpt: "Hi", body: "Body" });
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/admin/articles");
    expect(res.status).toBe(401);
  });
});

describe("Articles: admin CRUD + publish lifecycle", () => {
  it("creates a draft article with a generated, unique slug", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post("/api/admin/articles")
      .set(auth)
      .send({ title: "Hello, World!", excerpt: "An intro post.", body: "Welcome to EventFlow." });

    expect(res.status).toBe(201);
    expect(res.body.data.article.slug).toBe("hello-world");
    expect(res.body.data.article.status).toBe("DRAFT");
    expect(res.body.data.article.publishedAt).toBeNull();
  });

  it("appends a numeric suffix when two articles share a title", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post("/api/admin/articles").set(auth).send({ title: "Big News", excerpt: "e", body: "b" });
    const second = await request(app).post("/api/admin/articles").set(auth).send({ title: "Big News", excerpt: "e2", body: "b2" });

    expect(second.body.data.article.slug).toBe("big-news-2");
  });

  it("does not let a title edit happen -- update only touches excerpt/body", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post("/api/admin/articles").set(auth).send({ title: "Original", excerpt: "e", body: "b" });
    const articleId = created.body.data.article.id;

    const updated = await request(app)
      .put(`/api/admin/articles/${articleId}`)
      .set(auth)
      .send({ excerpt: "New excerpt", body: "New body", title: "Attempted rename" });

    expect(updated.status).toBe(200);
    expect(updated.body.data.article.title).toBe("Original");
    expect(updated.body.data.article.excerpt).toBe("New excerpt");
  });

  it("publishing sets status + publishedAt; unpublishing reverts status only", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post("/api/admin/articles").set(auth).send({ title: "Launch", excerpt: "e", body: "b" });
    const articleId = created.body.data.article.id;

    const published = await request(app).post(`/api/admin/articles/${articleId}/publish`).set(auth);
    expect(published.body.data.article.status).toBe("PUBLISHED");
    expect(published.body.data.article.publishedAt).not.toBeNull();

    const unpublished = await request(app).post(`/api/admin/articles/${articleId}/unpublish`).set(auth);
    expect(unpublished.body.data.article.status).toBe("DRAFT");
  });

  it("deletes an article", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post("/api/admin/articles").set(auth).send({ title: "Gone Soon", excerpt: "e", body: "b" });
    const articleId = created.body.data.article.id;

    const del = await request(app).delete(`/api/admin/articles/${articleId}`).set(auth);
    expect(del.status).toBe(204);

    const list = await request(app).get("/api/admin/articles").set(auth);
    expect(list.body.data.articles).toHaveLength(0);
  });
});

describe("Articles: public visibility", () => {
  it("hides drafts from the public list and detail endpoints", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app).post("/api/admin/articles").set(auth).send({ title: "Still Cooking", excerpt: "e", body: "b" });
    const slug = created.body.data.article.slug;

    const list = await request(app).get("/api/articles");
    expect(list.body.data.articles).toHaveLength(0);

    const detail = await request(app).get(`/api/articles/${slug}`);
    expect(detail.status).toBe(404);
  });

  it("shows a published article on the public endpoints, ordered by publishedAt desc", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const first = await request(app).post("/api/admin/articles").set(auth).send({ title: "First Post", excerpt: "e", body: "b" });
    await request(app).post(`/api/admin/articles/${first.body.data.article.id}/publish`).set(auth);

    const second = await request(app).post("/api/admin/articles").set(auth).send({ title: "Second Post", excerpt: "e2", body: "b2" });
    await request(app).post(`/api/admin/articles/${second.body.data.article.id}/publish`).set(auth);

    const list = await request(app).get("/api/articles");
    expect(list.status).toBe(200);
    expect(list.body.data.articles).toHaveLength(2);
    expect(list.body.data.articles[0].title).toBe("Second Post"); // most recently published first

    const detail = await request(app).get(`/api/articles/${second.body.data.article.slug}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.article.title).toBe("Second Post");
  });

  it("re-publishing an old draft brings it back to the top", async () => {
    const { token } = await registerAndLoginAsAdmin(app);
    const auth = { Authorization: `Bearer ${token}` };

    const first = await request(app).post("/api/admin/articles").set(auth).send({ title: "Old News", excerpt: "e", body: "b" });
    await request(app).post(`/api/admin/articles/${first.body.data.article.id}/publish`).set(auth);
    const second = await request(app).post("/api/admin/articles").set(auth).send({ title: "Fresh News", excerpt: "e2", body: "b2" });
    await request(app).post(`/api/admin/articles/${second.body.data.article.id}/publish`).set(auth);

    await request(app).post(`/api/admin/articles/${first.body.data.article.id}/unpublish`).set(auth);
    await request(app).post(`/api/admin/articles/${first.body.data.article.id}/publish`).set(auth);

    const list = await request(app).get("/api/articles");
    expect(list.body.data.articles[0].title).toBe("Old News");
  });
});
