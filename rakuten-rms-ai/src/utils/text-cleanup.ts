const TRAILING_META_RE =
  /[\s\n]*[（(【※]?\s*(?:文字数\s*[：:]\s*\d+\s*文字?|約?\d+\s*文字)\s*[）)】]?\s*$/

export function stripTrailingMeta(text: string): string {
  return text.replace(TRAILING_META_RE, "")
}
