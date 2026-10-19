// TapKit design tokens. Every colour, size and radius used by components comes from here.

export const colors = {
  brand: "#FF6A13",
  brandPressed: "#E85A07",
  brandSoft: "#FFF1E8",
  brandSofter: "#FFF8F3",
  /** Orange that passes WCAG AA for text on white (4.5:1). */
  brandText: "#C2410C",
  ink: "#1A1410",
  inkSoft: "#3D332C",
  muted: "#6B5E55",
  subtle: "#998B80",
  border: "#EDE4DC",
  borderStrong: "#DCCFC4",
  bg: "#FFFFFF",
  surface: "#FAF7F4",
  card: "#FFFFFF",
  success: "#15803D",
  successSoft: "#E8F7EE",
  warning: "#B45309",
  warningSoft: "#FFF5E0",
  danger: "#B91C1C",
  dangerSoft: "#FDECEC",
  info: "#1D4ED8",
  infoSoft: "#EBF1FF",
  overlay: "rgba(26,20,16,0.45)",
  white: "#FFFFFF",
} as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const type = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: "uppercase" as const },
} as const;

export type TypeVariant = keyof typeof type;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;
export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

export const shadow = {
  card: { shadowColor: "#3D2A1C", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  raised: { shadowColor: "#3D2A1C", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
} as const;
