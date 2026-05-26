import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView } from "react-native";
import { Eye, CloudRain, ShieldAlert, Check } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import { COLORS } from "../theme/colors";
import { GhostModeType } from "../hooks/useLocation";

interface GhostModeScreenProps {
  ghostMode: GhostModeType;
  onChangeMode: (mode: GhostModeType) => void;
  onClose: () => void;
}

export function GhostModeScreen({ ghostMode, onChangeMode, onClose }: GhostModeScreenProps) {
  const modesList = [
    {
      id: "precise" as GhostModeType,
      title: "Precise",
      description: "Bagikan lokasi realtime akurat Anda. Teman dapat melihat jalan, kecepatan, dan baterai Anda secara presisi.",
      icon: <Eye size={26} color={COLORS.cyan} />,
      color: COLORS.cyan,
      badgeText: "Realtime",
    },
    {
      id: "blurry" as GhostModeType,
      title: "Blurry",
      description: "Bagikan lokasi yang sedikit digeser (diacak dalam radius 1-2km). Teman hanya melihat area kabur umum Anda.",
      icon: <CloudRain size={26} color={COLORS.pink} />,
      color: COLORS.pink,
      badgeText: "Acak",
    },
    {
      id: "frozen" as GhostModeType,
      title: "Frozen",
      description: "Kunci lokasi Anda pada titik saat ini. Lokasi Anda tidak akan diperbarui lagi. Teman melihat Anda seperti sedang offline.",
      icon: <ShieldAlert size={26} color={COLORS.purple} />,
      color: COLORS.purple,
      badgeText: "Beku",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ghost Mode 👻</Text>
        <Text style={styles.subtitle}>
          Atur bagaimana teman-teman Anda melihat lokasi real-time Anda.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {modesList.map((mode) => {
          const isSelected = ghostMode === mode.id;

          return (
            <Pressable
              key={mode.id}
              onPress={() => onChangeMode(mode.id)}
              style={styles.cardWrapper}
            >
              <GlassCard
                style={[
                  styles.card,
                  isSelected && {
                    borderColor: mode.color,
                    borderWidth: 2,
                    shadowColor: mode.color,
                    shadowOpacity: 0.25,
                    shadowRadius: 15,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: mode.color + "15" }]}>
                    {mode.icon}
                  </View>
                  <View style={styles.titleWrapper}>
                    <Text style={styles.cardTitle}>{mode.title}</Text>
                    <View style={[styles.badge, { backgroundColor: mode.color + "25" }]}>
                      <Text style={[styles.badgeText, { color: mode.color }]}>{mode.badgeText}</Text>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkCircle, { backgroundColor: mode.color }]}>
                      <Check size={14} color="#000" strokeWidth={3} />
                    </View>
                  )}
                </View>

                <Text style={styles.cardDescription}>{mode.description}</Text>
              </GlassCard>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onClose} style={styles.applyButton}>
          <Text style={styles.applyText}>Terapkan & Kembali</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(10, 10, 12, 0.95)",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: {
    marginLeft: 14,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDescription: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
    paddingLeft: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  applyButton: {
    backgroundColor: COLORS.purple,
    borderRadius: 20,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  applyText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
export default GhostModeScreen;
