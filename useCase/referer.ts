const countReferer = async (title: string, locale: string) => {
  const encodedTitle = encodeURIComponent(title);
  const url = `https://${locale}.wikipedia.org/w/api.php?action=query&format=json&list=backlinks&bltitle=${encodedTitle}&bllimit=500&origin=*`;
  const response = await fetch(url);
  const json = await response.json();
  const numOfRef = json.query.backlinks.length; //5
  const hints = json.query.backlinks.map((item: any) => item.title); // ["a","b","c","d","e"]
  return { numOfRef, hints };
};

export default countReferer;
