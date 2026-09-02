type Backlink = { title: string };

const countReferer = async (title: string, locale: string) => {
  const encodedTitle = encodeURIComponent(title);
  const url = `https://${locale}.wikipedia.org/w/api.php?action=query&format=json&list=backlinks&bltitle=${encodedTitle}&bllimit=500&origin=*`;
  const response = await fetch(url);
  const json = await response.json();
  const backlinks: Backlink[] = Array.isArray(json?.query?.backlinks) ? json.query.backlinks : [];
  const numOfRef = backlinks.length;
  const hints = backlinks.map((item) => item.title);
  return { numOfRef, hints };
};

export default countReferer;
