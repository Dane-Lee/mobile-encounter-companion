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
