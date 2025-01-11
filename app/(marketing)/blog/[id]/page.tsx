import Posts from '@/lib/blog/Posts';
import { FullPost } from '@/components/blog/FullPost';
import { Metadata, ResolvingMetadata } from 'next';
import config from '@/lib/config';
import { notFound } from 'next/navigation';

const { siteName, siteUrl, twitterHandle } = config;

type Props = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = params;
  const { visiblePosts } = new Posts();
  const post = visiblePosts.find((post: any) => post.slug === id);

  console.log(post);

  if (!post) {
    return {
      title: '404',
    };
  }

  return {
    title: post.title,
    description: post.description,

    twitter: {
      card: 'summary_large_image',
      site: siteUrl,
      creator: twitterHandle,
      images: post.images?.length ? post.images[0] : undefined,
      description: post.description,
    },

    openGraph: {
      siteName,
      title: post.title,
      description: post.description,
      authors: [config.author.name],
      publishedTime: new Date(post.date).toISOString(),
      images: post.images
        ? post.images
            .map((image: any) => ({
              url: image,
              alt: post.title,
            }))
            .reverse()
        : [],
      type: 'article',
      locale: 'en_US',
      url: `${siteUrl}${post.relativeLink}`,
    },
  };
}

export function generateStaticParams() {
  const { visiblePosts } = new Posts();

  const all = visiblePosts.map((post: any) => ({
    year: String(post.year),
    month: String(post.month),
    day: String(post.day),
    slug: post.slug,
  }));

  return all;
}

export default async function Page({ params }: Props) {
  const { id } = params;
  const { visiblePosts } = new Posts();

  const post = visiblePosts.find((post: any) => post.slug === id);

  if (!post) {
    return notFound();
  }

  return <FullPost post={post} />;
}
