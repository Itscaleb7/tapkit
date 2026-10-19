import { View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

export interface BarDatum {
  label: string;
  value: number | null;
  highlight?: boolean;
}

/** Simple, accessible bar chart. Null values render as gaps (never as zero). */
export function BarChart({ data, width, height = 160, format = (v: number) => String(Math.round(v)), title }: { data: BarDatum[]; width: number; height?: number; format?: (v: number) => string; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const padTop = 20;
  const padBottom = 24;
  const chartH = height - padTop - padBottom;
  const slot = width / Math.max(1, data.length);
  const barW = Math.min(36, slot * 0.6);
  const summary = data.map((d) => `${d.label}: ${d.value === null ? "no data" : format(d.value)}`).join(", ");
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${title}. ${summary}`}>
      <Svg width={width} height={height}>
        <Line x1={0} y1={padTop + chartH} x2={width} y2={padTop + chartH} stroke={colors.border} strokeWidth={1} />
        {data.map((d, i) => {
          const x = i * slot + (slot - barW) / 2;
          const h = d.value === null ? 0 : Math.max(2, (d.value / max) * chartH);
          const y = padTop + chartH - h;
          return (
            <G key={i}>
              {d.value !== null && <Rect x={x} y={y} width={barW} height={h} rx={6} fill={d.highlight ? colors.brand : "#FFC9A6"} />}
              <SvgText x={x + barW / 2} y={d.value === null ? padTop + chartH - 6 : y - 6} fontSize={10} fontFamily={fonts.semibold} fill={colors.muted} textAnchor="middle">
                {d.value === null ? "–" : format(d.value)}
              </SvgText>
              <SvgText x={x + barW / 2} y={height - 6} fontSize={10} fontFamily={fonts.medium} fill={colors.muted} textAnchor="middle">
                {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
