import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { AuthedImage } from "@/components/ui/AuthedImage";
import { getApiErrorMessage } from "@/lib/api";
import {
  adminArticleCoverImagePath,
  useCreateArticle,
  useUpdateArticle,
  useUploadArticleCoverImage,
} from "@/hooks/useArticles";
import type { Article } from "@/types";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  excerpt: z.string().min(1, "Excerpt is required").max(400),
  body: z.string().min(1, "Body is required").max(20_000),
});
type FormValues = z.infer<typeof createSchema>;

function usePendingFilePreview(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

export function ArticleFormModal({
  open,
  onClose,
  article,
}: {
  open: boolean;
  onClose: () => void;
  article?: Article;
}) {
  const isEdit = !!article;
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const uploadCoverImage = useUploadArticleCoverImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const pendingPreviewUrl = usePendingFilePreview(pendingFile);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createSchema),
    values: article
      ? { title: article.title, excerpt: article.excerpt, body: article.body }
      : { title: "", excerpt: "", body: "" },
  });

  async function onSubmit(values: FormValues) {
    try {
      let articleId = article?.id;
      if (isEdit && article) {
        await updateArticle.mutateAsync({ articleId: article.id, input: { excerpt: values.excerpt, body: values.body } });
        toast.success("Article updated");
      } else {
        const created = await createArticle.mutateAsync(values);
        articleId = created.id;
        toast.success("Article created as a draft");
      }
      if (pendingFile && articleId) {
        await uploadCoverImage.mutateAsync({ articleId, file: pendingFile });
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit article" : "New article"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-600"
          >
            {pendingPreviewUrl ? (
              <img src={pendingPreviewUrl} alt="" className="h-full w-full object-cover" />
            ) : article?.hasCoverImage ? (
              <AuthedImage
                src={adminArticleCoverImagePath(article.id)}
                alt=""
                className="h-full w-full object-cover"
                fallback={<Upload className="h-6 w-6" />}
              />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </button>
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700">Cover image (optional)</p>
            <p>PNG, JPEG, or WEBP, up to 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {isEdit ? (
          <Field label="Title" htmlFor="a-title" hint="Titles can't be changed after an article is created, so its /articles link never breaks.">
            <Input id="a-title" value={article!.title} disabled />
          </Field>
        ) : (
          <Field label="Title" htmlFor="a-title" error={errors.title?.message}>
            <Input id="a-title" {...register("title")} error={!!errors.title} />
          </Field>
        )}
        <Field label="Excerpt" htmlFor="a-excerpt" error={errors.excerpt?.message} hint="A short summary shown in article lists and the landing page teaser.">
          <Textarea id="a-excerpt" rows={2} {...register("excerpt")} />
        </Field>
        <Field
          label="Body"
          htmlFor="a-body"
          error={errors.body?.message}
          hint="Plain text with light markdown: # heading, **bold**, [link](url), ![alt](image url), and a leading dash for bullet points."
        >
          <Textarea id="a-body" rows={12} className="font-mono text-xs" {...register("body")} />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Create draft"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
