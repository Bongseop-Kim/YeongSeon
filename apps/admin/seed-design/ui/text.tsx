/**
 * @file ui:text
 * @requires @seed-design/react@~1.0.0
 * @requires @seed-design/css@~1.0.0
 **/

import "@seed-design/css/recipes/text.css";

import type * as React from "react";
import { forwardRef, useMemo } from "react";

type TextElement =
  | "dt"
  | "dd"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "strong"
  | "legend";

type TextStyle =
  | "screenTitle"
  | "articleBody"
  | "articleNote"
  | "t1Regular"
  | "t1Medium"
  | "t1Bold"
  | "t2Regular"
  | "t2Medium"
  | "t2Bold"
  | "t3Regular"
  | "t3Medium"
  | "t3Bold"
  | "t4Regular"
  | "t4Medium"
  | "t4Bold"
  | "t5Regular"
  | "t5Medium"
  | "t5Bold"
  | "t6Regular"
  | "t6Medium"
  | "t6Bold"
  | "t7Regular"
  | "t7Medium"
  | "t7Bold"
  | "t8Bold"
  | "t9Bold"
  | "t10Bold"
  | "t1StaticRegular"
  | "t1StaticMedium"
  | "t1StaticBold"
  | "t2StaticRegular"
  | "t2StaticMedium"
  | "t2StaticBold"
  | "t3StaticRegular"
  | "t3StaticMedium"
  | "t3StaticBold"
  | "t4StaticRegular"
  | "t4StaticMedium"
  | "t4StaticBold"
  | "t5StaticRegular"
  | "t5StaticMedium"
  | "t5StaticBold"
  | "t6StaticRegular"
  | "t6StaticMedium"
  | "t6StaticBold"
  | "t7StaticRegular"
  | "t7StaticMedium"
  | "t7StaticBold"
  | "t8StaticBold"
  | "t9StaticBold"
  | "t10StaticBold";

interface TextStyleVariables extends React.CSSProperties {
  "--seed-max-lines"?: number;
  "--seed-text-color"?: string;
  "--seed-font-size"?: string;
  "--seed-line-height"?: string;
  "--seed-font-weight"?: string;
  "--seed-text-align"?: React.CSSProperties["textAlign"];
  "--seed-user-select"?: React.CSSProperties["userSelect"];
  "--seed-white-space"?: React.CSSProperties["whiteSpace"];
}

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextElement;
  textStyle?: TextStyle;
  color?: string;
  fontSize?: string;
  lineHeight?: string;
  fontWeight?: string;
  maxLines?: number;
  textDecorationLine?: "none" | "line-through" | "underline";
  align?: Extract<
    React.CSSProperties["textAlign"],
    "left" | "center" | "right"
  >;
  userSelect?: Extract<
    React.CSSProperties["userSelect"],
    "none" | "text" | "auto"
  >;
  whiteSpace?: Extract<
    React.CSSProperties["whiteSpace"],
    "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line" | "break-spaces"
  >;
}

function mapMaxLines(
  maxLines: number | undefined,
): "none" | "single" | "multi" {
  if (maxLines === undefined) return "none";
  if (maxLines === 1) return "single";
  return "multi";
}

function getTextClassName(
  textStyle: TextStyle | undefined,
  textDecorationLine: TextProps["textDecorationLine"] | undefined,
  maxLines: number | undefined,
) {
  return [
    "seed-text",
    `seed-text--textStyle_${textStyle ?? "t5Regular"}`,
    `seed-text--maxLines_${mapMaxLines(maxLines)}`,
    `seed-text--textDecorationLine_${textDecorationLine ?? "none"}`,
  ].join(" ");
}

/**
 * @see https://seed-design.io/react/components/typography/text
 */
export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as,
      color,
      textStyle,
      fontSize,
      lineHeight,
      fontWeight,
      maxLines,
      textDecorationLine,
      align,
      userSelect,
      whiteSpace,
      children,
      className,
      style,
      ...otherProps
    },
    ref,
  ) => {
    const Comp = (as || "span") as React.ElementType;
    const textClassName = useMemo(
      () => getTextClassName(textStyle, textDecorationLine, maxLines),
      [textStyle, textDecorationLine, maxLines],
    );
    const mergedClassName = className
      ? `${textClassName} ${className}`
      : textClassName;

    return (
      <Comp
        ref={ref}
        className={mergedClassName}
        style={
          {
            "--seed-max-lines": maxLines,
            "--seed-text-color": color,
            "--seed-font-size": fontSize,
            "--seed-line-height": lineHeight ?? fontSize,
            "--seed-font-weight": fontWeight,
            "--seed-text-align": align,
            "--seed-user-select": userSelect,
            "--seed-white-space": whiteSpace,
            ...style,
          } as TextStyleVariables
        }
        {...otherProps}
      >
        {children}
      </Comp>
    );
  },
);
Text.displayName = "Text";

/**
 * This file is a snippet from SEED Design, helping you get started quickly with @seed-design/* packages.
 * You can extend this snippet however you want.
 */
