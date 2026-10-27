import { Text, type TextProps } from 'react-native';

// Marker that callers pass as the placeholder value to t(), so the
// translated sentence can be split around it: t('k', { diff: BOLD_MARK }).
export const BOLD_MARK = '\u0001';

export interface TextWithBoldProps extends TextProps {
  // A translated sentence containing BOLD_MARK once.
  text: string;
  bold: string;
  className?: string;
  boldClassName?: string;
}

// "Rytais skausmas vidutiniškai **1,5** balo didesnis…" — one bold value
// inside a translated sentence, without splitting the sentence into
// separate keys (word order differs between English and Lithuanian).
export function TextWithBold({ text, bold, className, boldClassName, ...rest }: TextWithBoldProps) {
  const [before, after = ''] = text.split(BOLD_MARK);
  return (
    <Text className={className} {...rest}>
      {before}
      <Text className={`font-bold ${boldClassName ?? ''}`}>{bold}</Text>
      {after}
    </Text>
  );
}
