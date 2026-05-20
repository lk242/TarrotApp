export function stripFollowUpCardHeading(answer: string): string {
  const withoutCardHeading = answer
    .replace(/^#{1,6}\s*追問指引牌[^\n]*(?:\n+)?/gm, '')
    .replace(/^\*\*追問指引牌[:：]?\*\*[^\n]*(?:\n+)?/gm, '')
    .replace(/^追問指引牌[:：][^\n]*(?:\n+)?/gm, '')
    .trim();

  const firstSectionIndex = withoutCardHeading.search(
    /^#{1,6}\s*(延伸解析|具體行動方案|寄語)\s*$/m,
  );

  if (firstSectionIndex > 0) {
    return withoutCardHeading.slice(firstSectionIndex).trim();
  }

  return withoutCardHeading;
}
