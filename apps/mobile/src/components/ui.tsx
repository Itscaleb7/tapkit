import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { colors, hitSlop, radius, shadow, space, type, type TypeVariant } from "@/theme/tokens";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function tap() {
  if (Platform.OS === "ios") Haptics.selectionAsync().catch(() => undefined);
}

/* ------------------------------- Text ------------------------------- */

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: string;
  center?: boolean;
}

export function Text({ variant = "body", color = colors.ink, center, style, ...rest }: TextProps) {
  return <RNText maxFontSizeMultiplier={1.6} style={[type[variant], { color }, center && { textAlign: "center" }, style]} {...rest} />;
}

/* ------------------------------ Button ------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  title: string;
  variant?: ButtonVariant;
  size?: "md" | "sm" | "lg";
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border?: string; pressed: string }> = {
  primary: { bg: colors.brand, fg: colors.white, pressed: colors.brandPressed },
  dark: { bg: colors.ink, fg: colors.white, pressed: colors.inkSoft },
  secondary: { bg: colors.white, fg: colors.ink, border: colors.borderStrong, pressed: colors.surface },
  ghost: { bg: "transparent", fg: colors.brandText, pressed: colors.brandSoft },
  danger: { bg: colors.dangerSoft, fg: colors.danger, pressed: "#F9D9D9" },
};

export function Button({ title, variant = "primary", size = "md", icon, iconRight, loading, disabled, full, style, onPress, ...rest }: ButtonProps) {
  const c = buttonColors[variant];
  const height = size === "lg" ? 56 : size === "sm" ? 36 : 48;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      hitSlop={size === "sm" ? hitSlop : undefined}
      disabled={isDisabled}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: pressed ? c.pressed : c.bg, paddingHorizontal: size === "sm" ? space.md : space.xl },
        c.border && { borderWidth: 1, borderColor: c.border },
        full && { alignSelf: "stretch" },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === "sm" ? 16 : 19} color={c.fg} />}
          <Text variant={size === "sm" ? "smallStrong" : "bodyStrong"} color={c.fg} numberOfLines={1}>
            {title}
          </Text>
          {iconRight && <Ionicons name={iconRight} size={size === "sm" ? 16 : 19} color={c.fg} />}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color = colors.ink, size = 22, style }: { icon: IconName; label: string; onPress: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.surface }, style]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

/* ------------------------------- Card ------------------------------- */

export function Card({ children, style, onPress, accessibilityLabel, tone = "default" }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string; tone?: "default" | "brand" | "muted" | "dark" }) {
  const toneStyle =
    tone === "brand" ? { backgroundColor: colors.brandSoft, borderColor: "#FFD9C2" } : tone === "muted" ? { backgroundColor: colors.surface, borderColor: colors.border } : tone === "dark" ? { backgroundColor: colors.ink, borderColor: colors.ink } : null;
  if (!onPress) return <View style={[styles.card, toneStyle, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, toneStyle, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------ Badges ------------------------------ */

const badgeTones = {
  neutral: { bg: colors.surface, fg: colors.muted },
  brand: { bg: colors.brandSoft, fg: colors.brandText },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  dark: { bg: colors.ink, fg: colors.white },
};
export type BadgeTone = keyof typeof badgeTones;

export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={t.fg} />}
      <Text variant="caption" color={t.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ------------------------------ Chips ------------------------------- */

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={
        onPress &&
        (() => {
          tap();
          onPress();
        })
      }
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? colors.white : colors.inkSoft} />}
      <Text variant="smallStrong" color={selected ? colors.white : colors.inkSoft}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark" size={15} color={colors.white} />}
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple,
  max,
}: {
  options: readonly { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multiple?: boolean;
  max?: number;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const selected = value.includes(o.id);
        return (
          <Chip
            key={o.id}
            label={o.label}
            selected={selected}
            onPress={() => {
              if (!multiple) return onChange(selected ? [] : [o.id]);
              if (selected) return onChange(value.filter((v) => v !== o.id));
              if (max && value.length >= max) return;
              onChange([...value, o.id]);
            }}
          />
        );
      })}
    </View>
  );
}

/* ------------------------------ Layout ------------------------------ */

export function Row({ children, gap = space.sm, style, align = "center" }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; align?: ViewStyle["alignItems"] }) {
  return <View style={[{ flexDirection: "row", alignItems: align, gap }, style]}>{children}</View>;
}

export function Stack({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />;
}

export function SectionHeader({ title, action, onAction, subtitle }: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space.md }}>
      <View style={{ flex: 1 }}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" color={colors.muted}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && onAction && <Button title={action} variant="ghost" size="sm" onPress={onAction} />}
    </View>
  );
}

export function ListRow({ icon, title, subtitle, onPress, right, danger }: { icon?: IconName; title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.surface }]}
    >
      {icon && (
        <View style={[styles.listIcon, danger && { backgroundColor: colors.dangerSoft }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brandText} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={danger ? colors.danger : colors.ink}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="small" color={colors.muted} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.subtle} />)}
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.brand, height = 8, label }: { value: number; color?: string; height?: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }} style={{ height, borderRadius: height, backgroundColor: colors.border, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function StatTile({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: IconName }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ""}`}>
      <Row gap={6}>
        {icon && <Ionicons name={icon} size={14} color={colors.muted} />}
        <Text variant="caption" color={colors.muted}>
          {label}
        </Text>
      </Row>
      <Text variant="title">{value}</Text>
      {hint && (
        <Text variant="caption" color={colors.subtle}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export function BasisTag({ basis }: { basis: "user_fact" | "hypothesis" }) {
  return basis === "user_fact" ? <Badge label="From your answers" tone="success" icon="checkmark-circle" /> : <Badge label="Hypothesis to test" tone="warning" icon="flask" />;
}

const styles = StyleSheet.create({
  button: { borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  listRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md, paddingHorizontal: space.xs, minHeight: 56, borderRadius: radius.md },
  listIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  stat: { flex: 1, alignSelf: "stretch", backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: 2, minWidth: 100 },
});
