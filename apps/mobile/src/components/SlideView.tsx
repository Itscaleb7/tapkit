import { expoFontResolver, renderSlideSvg, SLIDE_HEIGHT, SLIDE_WIDTH, type Slide, slidesToPlainText } from "@tapkit/core";
import { type ComponentRef, forwardRef, useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { radius } from "@/theme/tokens";

interface Props {
  slide: Slide;
  index: number;
  total: number;
  themeId: string;
  handle?: string | null;
  width: number;
  rounded?: boolean;
  style?: ViewStyle;
}

/** Renders a slide exactly as it will export (same deterministic SVG as the PNG). */
export const SlideView = forwardRef<ComponentRef<typeof View>, Props>(function SlideView({ slide, index, total, themeId, handle, width, rounded = true, style }, ref) {
  const xml = useMemo(
    () => renderSlideSvg(slide, { index, total, themeId, handle: handle ?? undefined }, expoFontResolver).svg,
    [slide, index, total, themeId, handle],
  );
  const height = (width * SLIDE_HEIGHT) / SLIDE_WIDTH;
  return (
    <View
      ref={ref}
      collapsable={false}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Slide ${index + 1} of ${total}. ${slidesToPlainText([slide]).replace(/^Slide 1\n?/, "")}`}
      style={[{ width, height, overflow: "hidden", borderRadius: rounded ? radius.md : 0, backgroundColor: "#fff" }, style]}
    >
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  );
});
