import { supabase } from './supabaseClient.js';
import {
  buildTendenciasPublicationMap,
  formatTendenciasPublicationLine,
  isTendenciasFeedPost,
} from './tendenciasPublication.js';

const ENGAGEMENT_FEED_LOOKBACK_DAYS = 30;

/** Toggle like del cliente autenticado en una publicación Tendencias. */
export async function clientToggleMarketingLike(postId) {
  const id = Number(postId);
  if (!Number.isFinite(id)) {
    return { data: null, error: { message: 'Publicación inválida' } };
  }
  const { data, error } = await supabase.rpc('client_toggle_marketing_post_like', {
    p_post_id: id,
  });
  if (error) return { data: null, error };
  return { data, error: null };
}

/** IDs de posts que el cliente ya marcó con like. */
export async function clientMarketingLikedPostIds(postIds = []) {
  const ids = (postIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (!ids.length) return { data: [], error: null };
  const { data, error } = await supabase.rpc('client_marketing_liked_posts', {
    p_post_ids: ids,
  });
  if (error) return { data: [], error };
  const liked = (data || []).map((r) => Number(r.post_id ?? r)).filter(Number.isFinite);
  return { data: liked, error: null };
}

function engagementFeedSinceIso(lookbackDays = ENGAGEMENT_FEED_LOOKBACK_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(1, lookbackDays));
  return d.toISOString();
}

function mapEngagementEvent(base, post, publicationNo) {
  const title = String(post?.title || '').trim() || 'Sin título';
  const publicationLabel =
    formatTendenciasPublicationLine(publicationNo, { includeSource: true }) ||
    'Tendencias';
  return {
    ...base,
    postTitle: title,
    postBody: String(post?.body || '').trim(),
    publicationNo: Number.isFinite(publicationNo) && publicationNo > 0 ? publicationNo : null,
    publicationLabel,
  };
}

/**
 * Actividad en Tendencias para alertas del salón (likes y comentarios nuevos).
 * @param {string} sinceIso ISO timestamp — solo eventos posteriores
 */
export async function fetchMarketingEngagementSince(sinceIso) {
  return fetchMarketingEngagementCore(sinceIso || '1970-01-01T00:00:00.000Z');
}

/** Historial reciente para la pantalla Actividad en Tendencias (no depende de "última vista"). */
export async function fetchMarketingEngagementFeed(lookbackDays = ENGAGEMENT_FEED_LOOKBACK_DAYS) {
  return fetchMarketingEngagementCore(engagementFeedSinceIso(lookbackDays));
}

async function fetchMarketingEngagementCore(since) {
  const [likesRes, commentsRes, postsRes, birthdayRes] = await Promise.all([
    supabase
      .from('marketing_post_likes')
      .select('post_id, client_key, created_at')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('marketing_comments')
      .select('id, post_id, content, author_name, created_at, moderation_status')
      .eq('moderation_status', 'visible')
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('marketing_posts')
      .select('id, title, body, audience, status, media_url, content_type, published_at, created_at')
      .limit(500),
    supabase
      .from('birthday_club_reactions')
      .select('id, reaction, comment, author_name, created_at, updated_at, cliente_id')
      .or(`created_at.gt.${since},updated_at.gt.${since}`)
      .order('updated_at', { ascending: false })
      .limit(80),
  ]);

  const allPosts = postsRes.data || [];
  const postsById = new Map(allPosts.map((p) => [Number(p.id), p]));
  const publicationMap = buildTendenciasPublicationMap(allPosts);
  const tendenciasPostIds = new Set(
    allPosts.filter((p) => isTendenciasFeedPost(p)).map((p) => Number(p.id)),
  );

  const likes = (likesRes.data || [])
    .filter((l) => tendenciasPostIds.has(Number(l.post_id)))
    .map((l) => {
      const postId = Number(l.post_id);
      const post = postsById.get(postId);
      return mapEngagementEvent(
        {
          kind: 'like',
          id: `like-${l.post_id}-${l.client_key}-${l.created_at}`,
          postId: l.post_id,
          clientLabel: 'Cliente App',
          body: 'Le dio me gusta a una publicación',
          createdAt: l.created_at,
        },
        post,
        publicationMap.get(postId),
      );
    });

  const comments = (commentsRes.data || [])
    .filter((c) => tendenciasPostIds.has(Number(c.post_id)))
    .map((c) => {
      const postId = Number(c.post_id);
      const post = postsById.get(postId);
      return mapEngagementEvent(
        {
          kind: 'comment',
          id: `comment-${c.id}`,
          postId: c.post_id,
          clientLabel: c.author_name || 'Cliente',
          body: String(c.content || '').trim(),
          createdAt: c.created_at,
        },
        post,
        publicationMap.get(postId),
      );
    });

  const birthdayEvents = (birthdayRes.data || []).map((r) => {
    const reactionLabel =
      r.reaction === 'love' ? 'Me encanta' : r.reaction === 'dislike' ? 'No le convence' : 'Me gusta';
    const commentText = String(r.comment || '').trim();
    return {
      kind: r.reaction === 'love' ? 'birthday_love' : r.reaction === 'dislike' ? 'birthday_dislike' : 'birthday_like',
      id: `birthday-${r.id}-${r.updated_at || r.created_at}`,
      postId: null,
      clientLabel: r.author_name || 'Cliente web',
      body: commentText || reactionLabel,
      createdAt: r.updated_at || r.created_at,
      postTitle: 'Club Tu Cumpleaños',
      postBody: commentText,
      publicationNo: null,
      publicationLabel: 'Club Cumpleaños · Web',
    };
  });

  const merged = [...likes, ...comments, ...birthdayEvents].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  return {
    data: merged,
    error: likesRes.error || commentsRes.error || postsRes.error || birthdayRes.error || null,
  };
}
