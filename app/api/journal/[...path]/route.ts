import { NextRequest } from 'next/server'
import { failure, JournalError } from '@/lib/journal/server'
import { projectsApi } from '@/lib/journal/projectApi'
import { profileApi, followApi, discoverApi } from '@/lib/journal/profileApi'
import { postsApi, feedApi, weeklyApi } from '@/lib/journal/postApi'
import { commentsApi, reactionsApi, imagesApi } from '@/lib/journal/interactionApi'
export const dynamic = 'force-dynamic'
async function route(request: NextRequest, {
  params
}: {
  params: {
    path: string[];
  };
}) {
  try {
    const [resource, id, action, child] = params.path
    const method = request.method
    if (resource === 'profile' && !id && ['GET', 'PUT'].includes(method)) return await profileApi(request)
    if (resource === 'discover' && !id && method === 'GET') return await discoverApi(request)
    if (resource === 'weekly' && !id && method === 'GET') return await weeklyApi(request)
    if (resource === 'feed' && !id && method === 'GET') return await feedApi(request)
    if (resource === 'follow' && id && !action && ['GET', 'PUT', 'DELETE'].includes(method)) return await followApi(request, id)
    if (resource === 'projects' && !action && (!id && ['GET', 'POST'].includes(method) || id && ['GET', 'PUT', 'DELETE'].includes(method))) return await projectsApi(request, id)
    if (resource === 'posts' && id && action === 'support' && !child && ['GET', 'PUT', 'DELETE'].includes(method)) return await reactionsApi(request, id)
    if (resource === 'posts' && id && action === 'comments' && (!child && ['GET', 'POST'].includes(method) || child && method === 'DELETE')) return await commentsApi(request, id, child)
    if (resource === 'posts' && !action && (!id && ['GET', 'POST'].includes(method) || id && ['GET', 'PUT', 'DELETE'].includes(method))) return await postsApi(request, id)
    if (resource === 'images' && !action && (id && method === 'GET' || !id && method === 'POST')) return await imagesApi(request, id)
    throw new JournalError('Not found.', 404)
  } catch (error) {
    return failure(error)
  }
}
export { route as GET, route as POST, route as PUT, route as DELETE }
