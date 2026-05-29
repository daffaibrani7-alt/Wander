import React from "react";
import { View, TextInput, Pressable, StyleSheet, Keyboard } from "react-native";
import { Search, X } from "lucide-react-native";
import { GlassCard } from "@/shared/components/GlassCard";
import { COLORS } from "@/shared/theme/colors";
import { SPACING } from "@/shared/theme/spacing";
import { useThemeStore } from "@/features/settings/store/useThemeStore";

interface HomeSearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearchFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

export function HomeSearchBar({
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  onFocus,
  onBlur,
}: HomeSearchBarProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = COLORS.get(isDark);

  const handleCancel = () => {
    Keyboard.dismiss();
    onBlur();
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.row}>
        <Search size={16} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          id="search-input"
          placeholder="Cari teman..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={onFocus}
          onBlur={onBlur}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
        />
        {isSearchFocused && (
          <Pressable onPress={handleCancel} style={styles.cancelBtn}>
            <X size={14} color={theme.textMuted} />
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    paddingHorizontal: SPACING.md,
    height: 44,
    justifyContent: "center",
    borderRadius: 14,
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "System",
    padding: 0,
    margin: 0,
  },
  cancelBtn: {
    padding: 4,
  },
});
