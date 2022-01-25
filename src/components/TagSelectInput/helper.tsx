import { escape } from 'html-escaper';

export interface TextTag {
  title: string;
  key: string;
}

export const valueToHtml = (
  value: string,
  tagList: TextTag[],
  withEscape: boolean = true
): string => {
  if (!value) {
    return value;
  }
  const finalValue = withEscape ? escape(value) : value;
  let htmlStr = finalValue?.replace(getRegexExp(tagList), (replacement) => {
    return getTagElementString(replacement, tagList);
  });

  if (
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent)
  ) {
    htmlStr = htmlStr.replace(/\n/gm, '<br>'); // 在 safari 中必须要将 \n 转成 <br>,否则无法换行
  }

  return htmlStr;
};

export const pasteHtmlAtCaret = (str: string): void => {
  const sel = window.getSelection();
  if (sel.getRangeAt && sel.rangeCount) {
    let range = sel.getRangeAt(0);
    range.deleteContents();
    const el = document.createElement('div');
    el.innerHTML = escape(str);
    const frag = document.createDocumentFragment();
    let node;
    let lastNode;

    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.insertNode(frag);
    if (lastNode) {
      range = range.cloneRange();
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
};

// 将光标移动到内容最后
export const removePointerToLast = (el: HTMLElement): void => {
  if (el) {
    const range = window.getSelection(); // 创建range
    range.selectAllChildren(el); // range 选择obj下所有子内容
    range.collapseToEnd(); // 光标移至最后
  }
};

/**
 * 判断光标是否在输入框里
 * @param el
 * @returns
 */
export const isPointerInEditArea = (el: HTMLElement): boolean => {
  const sel = window.getSelection();
  let result = true;

  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);

    if (
      range.commonAncestorContainer !== el &&
      range.commonAncestorContainer.parentNode !== el
    ) {
      result = false;
    }
  } else {
    result = false;
  }

  return result;
};

/**
 * getTagElementString
 * @param text
 * @returns
 */
export const getTagElementString = (
  text: string,
  tagList: TextTag[]
): string => {
  let matchedTagText = '';

  tagList?.forEach((item) => {
    if (item.title?.toUpperCase() === text?.replace(/#/g, '')?.toUpperCase()) {
      matchedTagText = `#${item.title}#`;
    }
  });

  return matchedTagText
    ? `<i contenteditable="false" class="selected-tag">${matchedTagText}</i>`
    : text;
};

export const getRegexExp = (tagList: TextTag[]): RegExp => {
  const tags = (tagList || []).map((tag: TextTag) => tag.title);

  return new RegExp(
    `(?!<i contentEditable="false" class="selected-tag">)#(${tags?.join(
      '|'
    )})#(?!<\\/i>)`,
    'gi'
  );
};
