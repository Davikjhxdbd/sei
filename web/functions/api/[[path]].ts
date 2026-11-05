export async function onRequest({ request, env }: any) {
  const apiOrigin = env.API_ORIGIN.replace(/\/+$/, '');
  const url = new URL(request.url);
  const target = `${apiOrigin}${url.pathname}${url.search}`;

  return fetch(new Request(target, request));
}
