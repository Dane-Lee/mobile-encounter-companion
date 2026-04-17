export const parseTagsText = (value: string) =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );

export const toTagsText = (tags: string[]) => tags.join(', ');

export const hasTagValue = (tags: string[], targetTag: string) =>
  tags.some((tag) => tag.toLocaleLowerCase() === targetTag.trim().toLocaleLowerCase());

export const toggleTagInText = (value: string, targetTag: string) => {
  const tags = parseTagsText(value);

  return hasTagValue(tags, targetTag)
    ? toTagsText(tags.filter((tag) => tag.toLocaleLowerCase() !== targetTag.toLocaleLowerCase()))
    : toTagsText([...tags, targetTag]);
};
