import { Ionicons } from "@expo/vector-icons";
import { type ComponentRef, forwardRef, useState } from "react";
import { Pressable, StyleSheet, Switch, TextInput, type TextInputProps, View } from "react-native";
import { colors, fonts, radius, space } from "@/theme/tokens";
import { Chip, Text, tap } from "./ui";

export function Field({ label, hint, error, children, optional }: { label: string; hint?: string; error?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="smallStrong" color={colors.inkSoft}>
        {label}
        {optional ? <Text variant="small" color={colors.subtle}>{"  optional"}</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text variant="small" color={colors.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color={colors.muted}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface InputProps extends TextInputProps {
  invalid?: boolean;
  multilineHeight?: number;
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, InputProps>(function Input({ invalid, style, multiline, multilineHeight = 120, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.subtle}
      selectionColor={colors.brand}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      maxFontSizeMultiplier={1.5}
      onFocus={(e) => {
        setFocused(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        rest.onBlur?.(e);
      }}
      style={[
        styles.input,
        multiline && { minHeight: multilineHeight, paddingTop: 14 },
        focused && { borderColor: colors.brand, backgroundColor: colors.white },
        invalid && { borderColor: colors.danger },
        style,
      ]}
      {...rest}
    />
  );
});

/** Free-text tags: type and press return / comma to add. */
export function TagInput({ value, onChange, placeholder, max = 12, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number; suggestions?: readonly string[] }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, "").trim();
    if (!t || value.some((v) => v.toLowerCase() === t.toLowerCase()) || value.length >= max) return setDraft("");
    onChange([...value, t.slice(0, 60)]);
    setDraft("");
  };
  const unused = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 10);
  return (
    <View style={{ gap: space.sm }}>
      {value.length > 0 && (
        <View style={styles.wrap}>
          {value.map((v) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${v}`}
              onPress={() => {
                tap();
                onChange(value.filter((x) => x !== v));
              }}
              style={styles.tag}
            >
              <Text variant="smallStrong" color={colors.white}>
                {v}
              </Text>
              <Ionicons name="close" size={14} color={colors.white} />
            </Pressable>
          ))}
        </View>
      )}
      {value.length < max && (
        <Input
          value={draft}
          placeholder={placeholder ?? "Type and press return"}
          onChangeText={(t) => (t.endsWith(",") ? add(t) : setDraft(t))}
          onSubmitEditing={() => add(draft)}
          submitBehavior="submit"
          returnKeyType="done"
          autoCapitalize="none"
        />
      )}
      {unused.length > 0 && (
        <View style={styles.wrap}>
          {unused.map((s) => (
            <Chip key={s} label={`+ ${s}`} onPress={() => add(s)} />
          ))}
        </View>
      )}
    </View>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              tap();
              onChange(o.id);
            }}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text variant="smallStrong" color={active ? colors.ink : colors.muted} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint && (
          <Text variant="small" color={colors.muted}>
            {hint}
          </Text>
        )}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: colors.brand, false: colors.borderStrong }} />
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 30, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - 1))} style={styles.stepBtn}>
        <Ionicons name="remove" size={20} color={colors.ink} />
      </Pressable>
      <Text variant="heading" accessibilityLabel={`${label}: ${value}`} style={{ minWidth: 32, textAlign: "center" }}>
        {value}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={() => onChange(Math.min(max, value + 1))} style={styles.stepBtn}>
        <Ionicons name="add" size={20} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.lg,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  segment: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.border },
  segmentItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
});
