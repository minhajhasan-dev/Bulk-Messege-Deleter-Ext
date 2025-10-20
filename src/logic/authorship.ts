export function isLikelyMyMessage(el: Element): boolean {
  const role = el.getAttribute('role') || '';
  const ariaLabel = el.getAttribute('aria-label') || '';
  const className = el.className || '';
  const dataTestid = el.getAttribute('data-testid') || '';

  if (/you[:\-]/i.test(ariaLabel)) return true;
  if (/outgoing|own|self|me|yours/i.test(className)) return true;
  if (/outgoing|own_message|self_message/i.test(dataTestid)) return true;

  const style = (el as HTMLElement).style || ({} as CSSStyleDeclaration);
  if (style.alignSelf && /flex-end|end/.test(style.alignSelf)) return true;

  let node: Element | null = el;
  let depth = 0;
  while (node && depth < 3) {
    const dataAuthor = node.getAttribute('data-author') || '';
    if (dataAuthor && /me|self|you/i.test(dataAuthor)) return true;
    node = node.parentElement;
    depth += 1;
  }

  const text = el.textContent || '';
  if (/^you\s*:/i.test(text.trim())) return true;

  return false;
}
