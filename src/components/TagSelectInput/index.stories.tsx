import React, { useState } from 'react';
import { Story, Meta } from '@storybook/react';
import TagSelectInput, { ITagSelectInputProps } from '.';

export default {
  title: 'Components/TagSelectInput',
  component: TagSelectInput,
  decorators: [(Story): JSX.Element => <div>{Story()}</div>]
} as Meta;

const tagList = [
  {
    title: 'tag1',
    key: '1'
  },
  {
    title: 'tag2',
    key: '2'
  },
  {
    title: 'tag3',
    key: '3'
  }
];

const SingleMode = (args): JSX.Element => {
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('DAP');
  const onChange1 = (value: string): void => {
    setValue1(value);
  };

  const onChange2 = (value: string): void => {
    setValue2(value);
  };

  const customArgs1 = {
    value: value1,
    onChange: onChange1,
    manualLineBreak: false,
    disabled: false,
    autoSize: { minRows: 50, maxRows: 80 },
    style: { width: 600 },
    placeholder: 'not allow return'
  };
  const customArgs2 = {
    value: value2,
    onChange: onChange2,
    disabled: false,
    autoSize: { minRows: 50, maxRows: 80 },
    style: { width: 600 },
    placeholder: 'allow return'
  };

  return (
    <div style={{ display: 'flex' }}>
      <TagSelectInput {...args} {...customArgs1} />
      <TagSelectInput {...args} {...customArgs2} />
    </div>
  );
};

export const Default = SingleMode.bind({}) as Story<ITagSelectInputProps>;

Default.args = {
  tagList
};
