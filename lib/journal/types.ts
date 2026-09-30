export interface Author {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}
export interface Stats {
  seconds: number;
  sessions: number;
}
export interface Project {
  id: string;
  userId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string;
  content: string;
  status: 'PLANNING' | 'BUILDING' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  visibility: 'PUBLIC' | 'PRIVATE';
  pinned: boolean;
  websiteUrl: string | null;
  githubUrl: string | null;
  startedAt: string;
  completedAt: string | null;
  stats: Stats;
}
export interface Milestone {
  title: string;
  description: string;
  type: string;
  achievedAt: string;
  focusedSecondsSnapshot: number;
  sessionsSnapshot: number;
  imageUrl: string | null;
}
export interface Post {
  id: string;
  authorId: string;
  projectId: string | null;
  slug: string;
  type: 'UPDATE' | 'MILESTONE' | 'WEEKLY_UPDATE';
  title: string | null;
  content: string;
  images: string[];
  important: boolean;
  visibility: 'PUBLIC' | 'PRIVATE';
  showFocusStats: boolean;
  focusedSecondsSnapshot: number | null;
  sessionsSnapshot: number | null;
  statsFrom: string | null;
  statsTo: string | null;
  publishedAt: string | null;
  editedAt: string | null;
  createdAt: string;
  author: Author;
  project: {
    id: string;
    name: string;
    slug: string;
    visibility: 'PUBLIC' | 'PRIVATE';
  } | null;
  milestone: Milestone | null;
  _count: {
    reactions: number;
    comments: number;
  };
}
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}
export interface PageResult<T> {
  items: T[];
  hasMore: boolean;
}
export function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
export function profileHref(username: string) {
  return `/@${encodeURIComponent(username)}`
}
export function postHref(post: Pick<Post, 'slug' | 'author'>) {
  return `${profileHref(post.author.username)}/posts/${post.slug}`
}
