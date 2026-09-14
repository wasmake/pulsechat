import React, { ChangeEventHandler } from 'react';
import clsx from 'clsx';

export interface TextFieldProps
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  label: React.ReactNode;
  placeholder: string;
  multiline?: number;
}

const TextField = ({
  label,
  name,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  multiline,
  value,
  ...otherProps
}: TextFieldProps) => {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#e4e4e7]">
        {label}
      </label>
      <div className="relative">
        {!multiline && (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoComplete="off"
            className={clsx(
              'h-10 w-full rounded-md border border-[#3f3f46] bg-[#09090b] px-3 text-sm text-[#fafafa] outline-none transition-colors placeholder:text-[#52525b] focus:border-[#71717a] disabled:cursor-default disabled:opacity-60'
            )}
            required={required}
            {...otherProps}
          />
        )}
        {multiline && (
          <textarea
            name={name}
            value={value}
            onChange={
              onChange as unknown as ChangeEventHandler<HTMLTextAreaElement>
            }
            placeholder={placeholder}
            autoComplete="off"
            className={clsx(
              'w-full rounded-md border border-[#3f3f46] bg-[#09090b] px-3 py-2 text-sm text-[#fafafa] outline-none transition-colors placeholder:text-[#52525b] focus:border-[#71717a] disabled:cursor-default disabled:opacity-60'
            )}
            required={required}
            rows={multiline}
            {...(otherProps as React.DetailedHTMLProps<
              React.InputHTMLAttributes<HTMLTextAreaElement>,
              HTMLTextAreaElement
            >)}
          />
        )}
      </div>
    </div>
  );
};

export default TextField;
