import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import {
  POST_CATEGORY_COLORS,
  POST_CATEGORY_LABELS,
  formatPostDate,
  type Post,
} from "@/lib/posts";

type PostCardData = Pick<
  Post,
  "slug" | "cover_image" | "title" | "category" | "excerpt" | "published_at" | "author"
>;

interface Props {
  post: PostCardData;
}

export function PostCard({ post }: Props) {
  if (!post.slug) return null;
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
            ALQUIDEL
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span
          className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${POST_CATEGORY_COLORS[post.category]}`}
        >
          {POST_CATEGORY_LABELS[post.category]}
        </span>
        <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatPostDate(post.published_at)}</span>
          <span>·</span>
          <span>{post.author}</span>
        </div>
      </div>
    </Link>
  );
}