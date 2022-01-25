/* eslint-disable cognitive-complexity/cognitive-complexity-forced */
import React from 'react';
import { Dropdown, Menu } from 'antd';
import classnames from 'classnames';
import { isEqual, throttle } from 'lodash-es';
import { unescape } from 'html-escaper';
import { TextTag } from './helper';

import SelectTagIcon from '@/assets/svg/selectTag.svg';
import {
  pasteHtmlAtCaret,
  isPointerInEditArea,
  removePointerToLast,
  valueToHtml,
} from './helper';

import './index.less';

interface AutoSize {
  minRows?: number;
  maxRows?: number;
}

// 与原 API 相比，减少了：
// maxCharValidate ｜ manualLineBreak  ｜defaultValue
export interface ITagSelectInputProps {
  tagList: TextTag[];
  autoSize?: AutoSize; // 替换原 autoSize
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  manualLineBreak?: boolean;
  max?: number;
  style?: React.CSSProperties;
  showTag?: boolean;
  onChange?: (val: string) => void;
}

const LINE_HEIGHT = 24;

class TagSelectInput extends React.Component<ITagSelectInputProps, any> {
  editorRef: any;
  isOnCompositionRef: any;
  focused: boolean;
  inputStack: Array<string>;

  constructor(props) {
    super(props);
    this.editorRef = React.createRef();
    // 维护输入历史，用于 ctrl + z 恢复
    this.inputStack = [''];
    // isOnComposition 是否在拼音输入的过程
    this.isOnCompositionRef = React.createRef();
  }

  shouldComponentUpdate(nextProps, nextState): boolean {
    const { value, onChange, ...others } = this.props;
    const {
      value: valueFromNextProps,
      onChange: onChangeFromNextProps,
      ...othersFromNextProps
    } = nextProps;

    const staticPropsChanged = !isEqual(others, othersFromNextProps);

    if (staticPropsChanged) {
      return true;
    }

    const nextHtml = valueToHtml(nextProps?.value, nextProps.tagList, false);
    const currentHtml = this.editorRef.current?.innerHTML;
    // 通过 innerHtml 获取的值，如包含 < & 这些，会被转义
    const unescapedCurrentHtml =
      currentHtml !== undefined ? unescape(currentHtml) : '';
    const shouldUpdate = nextHtml?.trim() !== unescapedCurrentHtml?.trim(); // 刚输入的回车被浏览器识别为 \n ,后被转换成 br

    return shouldUpdate;
  }

  componentDidUpdate(): void {
    if (this.focused) {
      removePointerToLast(this.editorRef.current);
    }
  }

  updateInputStack = throttle(
    (val) => {
      this.inputStack.push(val);
    },
    500,
    { trailing: false }
  );

  setValue(val: string): void {
    this.props.onChange(val);
    this.updateInputStack(val);
  }

  /**
   * 检查长度
   */
  checkCharacterLength = (): boolean => {
    if (this.editorRef.current.innerText.length >= this.props.max) {
      return false;
    }
    return true;
  };

  renderTagsList = (): JSX.Element => {
    const { tagList } = this.props;

    return (
      <Menu>
        {!tagList?.length && 'No Data'}
        {tagList?.map((item) => {
          return (
            <Menu.Item
              key={item.key}
              suppressContentEditableWarning={true}
              contentEditable='false'
              style={{ userSelect: 'none' }}
              onClick={(): void => {
                // TODO: safari 下，点击下拉，光标位置被移到dropdown 上(可通过打印range的 ancestorNode 证明)，所以无法在中间插入 tag
                // 当光标不在 div 内时，自动将光标移到最后
                if (!isPointerInEditArea(this.editorRef.current)) {
                  removePointerToLast(this.editorRef.current);
                }

                if (!this.checkCharacterLength()) {
                  return;
                }

                pasteHtmlAtCaret(`#${item.title}#`);
                this.deleteDuplicateNewLineAndEmitChange();
              }}
            >
              {item.title}
            </Menu.Item>
          );
        })}
      </Menu>
    );
  };

  /**
   * 处理输入
   * @param e
   */
  handleInput = (e): void => {
    if (!this.isOnCompositionRef.current) {
      const input = e.target as HTMLInputElement;
      const newVal = input.innerText;

      this.setValue(newVal);
    }
  };

  /**
   * 处理粘贴
   */
  handlePaste = (e): void => {
    const { max, autoSize, manualLineBreak } = this.props;

    if (!this.checkCharacterLength()) {
      e.preventDefault();
    }

    let pasteData = e.clipboardData.getData('text/plain');

    if (!autoSize || manualLineBreak === false) {
      pasteData = pasteData?.replaceAll('\n', '');
    }
    const currentDom = this.editorRef.current;
    // 超长逻辑处理
    const currentLength = currentDom.innerText.length;
    if (pasteData.length + currentLength > max) {
      const splicedStr = pasteData.slice(0, max - currentLength);
      pasteHtmlAtCaret(splicedStr);
      this.setValue(currentDom.innerText);

      e.preventDefault();
      return;
    }

    pasteHtmlAtCaret(pasteData);
    this.deleteDuplicateNewLineAndEmitChange();

    e.preventDefault();
  };

  /**
   * 在末尾敲下回车，会出现两个 \n
   * 如果再次输入一个文本，最后一个\n会被输入文本替换
   * 如果此时点击下拉插入一个 tag，插入的tag 后会多一个 \n,且无法删除
   * 如果此时粘贴插入一个 tag，插入的tag 后会多一个 \n,,且无法删除
   * 接下来回车或继续插入tag，会跳两行
   * 所以需要手动替换掉最后不可删除的 \n
   */
  deleteDuplicateNewLineAndEmitChange = (): void => {
    const currentText = this.editorRef.current.innerText;
    const [secondLast, last] = [
      ...currentText.match(/[\s\S]{2}$/)[0], // 匹配最后两个字符
    ];
    if (last === '\n' && secondLast !== '\n') {
      const finalText = currentText.replace(/\n{1}$/, '');
      this.setValue(finalText);
    } else {
      this.setValue(currentText);
    }
  };

  /**
   * 处理键盘事件
   * @param e
   */
  handleKeyDown = (e): void => {
    const { autoSize, manualLineBreak } = this.props;

    // 回车
    if (e.keyCode === 13) {
      if (!autoSize || manualLineBreak === false) {
        e.preventDefault();
        return;
      }

      /**
       * 末尾敲一次回车，会产生两个 \n;
       * 如果在中间的换行末尾处回车：
       * 若此时末尾为文本，则只增加一个\n，只换一行；
       * 若此时末尾为标签，则增加两个\n,会产生换两行的问题
       */
      const sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const rangeContainer = range.startContainer as any;

        if (
          rangeContainer?.previousElementSibling?.className ===
            'selected-tag' &&
          (!rangeContainer.nodeValue || // 整段末尾
            range.startOffset === 0) // 中间末尾
        ) {
          // 在末尾处敲回车，且末尾处是标签，则只增加一个\n
          pasteHtmlAtCaret('\n');
          e.preventDefault();
        }
      }
    }

    //  ctrl + z
    if ((e.ctrlKey || e.metaKey) && (e.keyCode || e.charCode) === 90) {
      const { onChange } = this.props;
      const formerValue = this.inputStack.pop();
      onChange(formerValue);
      e.preventDefault();
    }

    // 退格
    if (!this.checkCharacterLength() && e.keyCode !== 8) {
      e.preventDefault();
    }
  };

  handleComposition = (evt): void => {
    if (evt.type === 'compositionend') {
      this.isOnCompositionRef.current = false;

      // 谷歌浏览器：compositionstart onChange compositionend
      // 火狐浏览器：compositionstart compositionend onChange
      if (navigator.userAgent.indexOf('Chrome') > -1) {
        this.handleInput(evt);
      }

      return;
    }

    this.isOnCompositionRef.current = true;
  };

  render(): JSX.Element {
    const {
      tagList,
      placeholder,
      disabled,
      autoSize,
      style,
      value,
      showTag = true,
    } = this.props;

    return (
      <div className='tag-select-input' style={{ ...style }}>
        {disabled ? (
          <div className='disabled'>{value}</div>
        ) : (
          <>
            <div
              ref={this.editorRef}
              contentEditable={'plaintext-only' as any}
              suppressContentEditableWarning={true}
              className={classnames({
                'input-area': true,
                'single-line': !autoSize,
              })}
              style={{
                minHeight: autoSize?.minRows
                  ? LINE_HEIGHT * autoSize.minRows
                  : LINE_HEIGHT,
                maxHeight: autoSize?.maxRows
                  ? LINE_HEIGHT * autoSize.maxRows
                  : LINE_HEIGHT,
              }}
              placeholder={placeholder}
              onCompositionStart={this.handleComposition}
              onCompositionUpdate={this.handleComposition}
              onCompositionEnd={this.handleComposition}
              onInput={this.handleInput}
              onPaste={this.handlePaste}
              onBlur={(): void => {
                this.focused = false;
              }}
              onFocus={(): void => {
                this.focused = true;
              }}
              onKeyDown={this.handleKeyDown}
              dangerouslySetInnerHTML={{
                __html: valueToHtml(value, tagList),
              }}
            />
            <Dropdown
              className={classnames('selected-tag-dropdown', {
                hidden: !showTag,
              })}
              trigger={['click']}
              overlay={this.renderTagsList()}
              placement='bottomRight'
            >
              <div>
                <SelectTagIcon />
              </div>
            </Dropdown>
          </>
        )}
      </div>
    );
  }
}

export default TagSelectInput;
